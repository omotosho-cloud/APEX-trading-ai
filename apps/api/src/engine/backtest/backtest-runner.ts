/**
 * APEX Strategy Backtest Runner
 *
 * Tests Strategy 1 (EMA Scalp) and Strategy 2 (EMA Flip) against historical
 * candle data stored in the database.
 *
 * Usage:
 *   pnpm backtest                        # runs both strategies on all synthetics
 *   pnpm backtest --strategy ema-scalp   # Strategy 1 only
 *   pnpm backtest --strategy ema-flip    # Strategy 2 only
 *   pnpm backtest --instrument R_75      # single instrument
 *   pnpm backtest --instrument R_75 --strategy ema-flip
 */

import "dotenv/config";
import { tsdb } from "../../db/client.js";
import { candles } from "../../db/schema/index.js";
import { and, eq, asc } from "drizzle-orm";
import { writeFileSync } from "fs";
import { evaluateEmaStrategy } from "../strategy/ema-strategy.js";
import { evaluateFlipStrategy } from "../strategy/ema-flip-strategy.js";
import { SYNTHETIC_INSTRUMENTS } from "../market-data/instruments.js";
import type { OHLCV } from "../indicators/indicator-engine.js";

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
function getArg(flag: string): string | null {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? (args[idx + 1] ?? null) : null;
}

const STRATEGY_ARG  = getArg("--strategy");   // "ema-scalp" | "ema-flip" | null (both)
const INSTRUMENT_ARG = getArg("--instrument"); // e.g. "R_75" | null (all)

const RUN_SCALP = !STRATEGY_ARG || STRATEGY_ARG === "ema-scalp";
const RUN_FLIP  = !STRATEGY_ARG || STRATEGY_ARG === "ema-flip";

// ── Config ────────────────────────────────────────────────────────────────────

const RISK_PER_TRADE_PCT = 1.0;  // 1% risk per trade
const FORWARD_BARS       = 200;  // max bars to look ahead for SL/TP
const MIN_TRADES         = 15;   // minimum trades to report a result
const COOLDOWN_BARS      = 3;    // min bars between signals (avoid re-entry)

// Walk-forward split date — trades before this = in-sample, after = out-of-sample
const OOS_SPLIT = "2025-01-01";

// ── Types ─────────────────────────────────────────────────────────────────────

type TradeOutcome = "tp1" | "sl" | "expired";

type Trade = {
  entryBar:    number;
  entryTime:   Date;
  direction:   "buy" | "sell";
  entryPrice:  number;
  slPrice:     number;
  tp1Price:    number;
  outcome:     TradeOutcome;
  barsToClose: number;
  pnlR:        number;       // profit in R multiples (1R = 1% risk)
  period:      "in-sample" | "out-of-sample";
  entryType?:  string;       // "crossover" | "retest" (flip only)
  htfStrength?: string;      // "strong" | "normal" (flip only)
};

type PeriodStats = {
  trades:           number;
  wins:             number;
  losses:           number;
  winRate:          number;
  profitFactor:     number;
  expectancy:       number;   // avg R per trade
  totalR:           number;
  maxDrawdown:      number;   // % of peak equity
  sharpe:           number;
  worstStreak:      number;
  profitableMonths: number;
  totalMonths:      number;
};

type InstrumentResult = {
  instrument:   string;
  strategy:     string;
  dataMonths:   number;
  inSample:     PeriodStats | null;
  outOfSample:  PeriodStats | null;
  combined:     PeriodStats | null;
  entryBreakdown: {
    crossover: { trades: number; winRate: number };
    retest:    { trades: number; winRate: number };
  } | null;
};

// ── DB helpers ────────────────────────────────────────────────────────────────

async function fetchBars(
  instrument: string,
  timeframe: string,
  limit = 8000,
): Promise<(OHLCV & { time: Date })[]> {
  const rows = await tsdb
    .select()
    .from(candles)
    .where(and(eq(candles.instrument, instrument), eq(candles.timeframe, timeframe)))
    .orderBy(asc(candles.time))
    .limit(limit);

  return rows.map((r) => ({
    open:   parseFloat(r.open),
    high:   parseFloat(r.high),
    low:    parseFloat(r.low),
    close:  parseFloat(r.close),
    volume: parseFloat(r.volume),
    time:   new Date(r.time),
  }));
}

// ── Trade simulation ──────────────────────────────────────────────────────────

function simulateOutcome(
  futureBars: OHLCV[],
  direction:  "buy" | "sell",
  slPrice:    number,
  tp1Price:   number,
): { outcome: TradeOutcome; barsToClose: number; pnlR: number } {
  for (let i = 0; i < futureBars.length && i < FORWARD_BARS; i++) {
    const bar = futureBars[i]!;

    if (direction === "buy") {
      if (bar.low  <= slPrice)  return { outcome: "sl",  barsToClose: i + 1, pnlR: -1 * (RISK_PER_TRADE_PCT / 100) };
      if (bar.high >= tp1Price) return { outcome: "tp1", barsToClose: i + 1, pnlR: +1.5 * (RISK_PER_TRADE_PCT / 100) };
    } else {
      if (bar.high >= slPrice)  return { outcome: "sl",  barsToClose: i + 1, pnlR: -1 * (RISK_PER_TRADE_PCT / 100) };
      if (bar.low  <= tp1Price) return { outcome: "tp1", barsToClose: i + 1, pnlR: +1.5 * (RISK_PER_TRADE_PCT / 100) };
    }
  }
  // Neither hit within FORWARD_BARS — expired
  return { outcome: "expired", barsToClose: FORWARD_BARS, pnlR: 0 };
}

// ── Stats calculation ─────────────────────────────────────────────────────────

function calcStats(trades: Trade[]): PeriodStats | null {
  if (trades.length < MIN_TRADES) return null;

  const wins   = trades.filter((t) => t.outcome === "tp1");
  const losses = trades.filter((t) => t.outcome === "sl");
  const winRate = wins.length / trades.length;
  const returns = trades.map((t) => t.pnlR);
  const totalR  = returns.reduce((a, b) => a + b, 0);
  const avgR    = totalR / returns.length;

  // Equity curve + max drawdown
  let equity = 1.0, peak = 1.0, maxDD = 0;
  for (const r of returns) {
    equity *= 1 + r;
    peak = Math.max(peak, equity);
    maxDD = Math.max(maxDD, (peak - equity) / peak);
  }

  // Sharpe (annualised, assuming ~288 M5 bars per day → ~72k per year)
  const std = Math.sqrt(
    returns.reduce((s, r) => s + (r - avgR) ** 2, 0) / returns.length,
  );
  const barsPerYear = 288 * 260; // M5 bars, 260 trading days
  const sharpe = std > 0 ? (avgR / std) * Math.sqrt(barsPerYear) : 0;

  // Profit factor
  const grossWin  = wins.reduce((s, t) => s + t.pnlR, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnlR, 0));
  const profitFactor = grossLoss > 0
    ? grossWin / grossLoss
    : grossWin > 0 ? 999 : 0;

  // Worst consecutive loss streak
  let streak = 0, worstStreak = 0;
  for (const t of trades) {
    if (t.outcome === "sl") { streak++; worstStreak = Math.max(worstStreak, streak); }
    else streak = 0;
  }

  // Monthly profitability
  const byMonth: Record<string, number> = {};
  for (const t of trades) {
    const month = t.entryTime.toISOString().slice(0, 7);
    byMonth[month] = (byMonth[month] ?? 0) + t.pnlR;
  }
  const months = Object.values(byMonth);
  const profitableMonths = months.filter((r) => r > 0).length;

  return {
    trades:           trades.length,
    wins:             wins.length,
    losses:           losses.length,
    winRate:          Math.round(winRate * 1000) / 10,
    profitFactor:     Math.round(profitFactor * 100) / 100,
    expectancy:       Math.round(avgR * 10000) / 10000,
    totalR:           Math.round(totalR * 10000) / 10000,
    maxDrawdown:      Math.round(maxDD * 1000) / 10,
    sharpe:           Math.round(sharpe * 100) / 100,
    worstStreak,
    profitableMonths,
    totalMonths:      months.length,
  };
}

// ── Strategy 1: EMA Scalp backtest ────────────────────────────────────────────

async function backtestScalp(instrument: string): Promise<InstrumentResult> {
  const [m5All, h1All] = await Promise.all([
    fetchBars(instrument, "M5"),
    fetchBars(instrument, "H1"),
  ]);

  const result: InstrumentResult = {
    instrument,
    strategy:    "ema-scalp",
    dataMonths:  0,
    inSample:    null,
    outOfSample: null,
    combined:    null,
    entryBreakdown: null,
  };

  if (m5All.length < 250 || h1All.length < 120) return result;

  const dataMonths = Math.round(
    (m5All[m5All.length - 1]!.time.getTime() - m5All[0]!.time.getTime())
    / (1000 * 60 * 60 * 24 * 30),
  );
  result.dataMonths = dataMonths;

  const splitDate  = new Date(OOS_SPLIT);
  const trades: Trade[] = [];
  let lastSignalBar = -999;

  // Step through M5 bars — need 130 for EMA100 + lookback
  for (let i = 130; i < m5All.length - FORWARD_BARS; i++) {
    if (i - lastSignalBar < COOLDOWN_BARS) continue;

    const m5Window = m5All.slice(0, i + 1).map(({ time: _t, ...b }) => b);

    // Build H1 window aligned to this M5 bar's time
    const barTime = m5All[i]!.time;
    const h1Window = h1All
      .filter((b) => b.time <= barTime)
      .map(({ time: _t, ...b }) => b);

    if (h1Window.length < 110) continue;

    const signal = evaluateEmaStrategy(m5Window, h1Window);
    if (!signal.valid) continue;

    const futureBars = m5All.slice(i + 1, i + 1 + FORWARD_BARS)
      .map(({ time: _t, ...b }) => b);

    const sim = simulateOutcome(
      futureBars,
      signal.direction,
      signal.slPrice,
      signal.tp1Price,
    );

    trades.push({
      entryBar:    i,
      entryTime:   barTime,
      direction:   signal.direction,
      entryPrice:  signal.entryPrice,
      slPrice:     signal.slPrice,
      tp1Price:    signal.tp1Price,
      outcome:     sim.outcome,
      barsToClose: sim.barsToClose,
      pnlR:        sim.pnlR,
      period:      barTime >= splitDate ? "out-of-sample" : "in-sample",
    });

    lastSignalBar = i;
  }

  const isTrades  = trades.filter((t) => t.period === "in-sample");
  const oosTrades = trades.filter((t) => t.period === "out-of-sample");

  result.inSample    = calcStats(isTrades);
  result.outOfSample = calcStats(oosTrades);
  result.combined    = calcStats(trades);

  return result;
}

// ── Strategy 2: EMA Flip backtest ─────────────────────────────────────────────

async function backtestFlip(instrument: string): Promise<InstrumentResult> {
  const [m5All, m15All, m30All, h1All, h4All] = await Promise.all([
    fetchBars(instrument, "M5"),
    fetchBars(instrument, "M15"),
    fetchBars(instrument, "M30"),
    fetchBars(instrument, "H1"),
    fetchBars(instrument, "H4"),
  ]);

  const result: InstrumentResult = {
    instrument,
    strategy:    "ema-flip",
    dataMonths:  0,
    inSample:    null,
    outOfSample: null,
    combined:    null,
    entryBreakdown: { crossover: { trades: 0, winRate: 0 }, retest: { trades: 0, winRate: 0 } },
  };

  if (m5All.length < 215) return result;

  const dataMonths = Math.round(
    (m5All[m5All.length - 1]!.time.getTime() - m5All[0]!.time.getTime())
    / (1000 * 60 * 60 * 24 * 30),
  );
  result.dataMonths = dataMonths;

  const splitDate = new Date(OOS_SPLIT);
  const trades: Trade[] = [];
  let lastSignalBar = -999;

  for (let i = 215; i < m5All.length - FORWARD_BARS; i++) {
    if (i - lastSignalBar < COOLDOWN_BARS) continue;

    const barTime = m5All[i]!.time;

    // Slice all timeframes aligned to current M5 bar time
    const m5Window  = m5All.slice(0, i + 1).map(({ time: _t, ...b }) => b);
    const m15Window = m15All.filter((b) => b.time <= barTime).map(({ time: _t, ...b }) => b);
    const m30Window = m30All.filter((b) => b.time <= barTime).map(({ time: _t, ...b }) => b);
    const h1Window  = h1All.filter((b) => b.time <= barTime).map(({ time: _t, ...b }) => b);
    const h4Window  = h4All.filter((b) => b.time <= barTime).map(({ time: _t, ...b }) => b);

    const signal = evaluateFlipStrategy(m5Window, m15Window, m30Window, h1Window, h4Window);
    if (!signal.valid) continue;

    const futureBars = m5All.slice(i + 1, i + 1 + FORWARD_BARS)
      .map(({ time: _t, ...b }) => b);

    const sim = simulateOutcome(
      futureBars,
      signal.direction,
      signal.slPrice,
      signal.tp1Price,
    );

    trades.push({
      entryBar:    i,
      entryTime:   barTime,
      direction:   signal.direction,
      entryPrice:  signal.entryPrice,
      slPrice:     signal.slPrice,
      tp1Price:    signal.tp1Price,
      outcome:     sim.outcome,
      barsToClose: sim.barsToClose,
      pnlR:        sim.pnlR,
      period:      barTime >= splitDate ? "out-of-sample" : "in-sample",
      entryType:   signal.entryType,
      htfStrength: signal.htfStrength,
    });

    lastSignalBar = i;
  }

  // Entry type breakdown
  const crossoverTrades = trades.filter((t) => t.entryType === "crossover");
  const retestTrades    = trades.filter((t) => t.entryType === "retest");

  const crossoverWins = crossoverTrades.filter((t) => t.outcome === "tp1").length;
  const retestWins    = retestTrades.filter((t) => t.outcome === "tp1").length;

  result.entryBreakdown = {
    crossover: {
      trades:  crossoverTrades.length,
      winRate: crossoverTrades.length > 0
        ? Math.round(crossoverWins / crossoverTrades.length * 1000) / 10
        : 0,
    },
    retest: {
      trades:  retestTrades.length,
      winRate: retestTrades.length > 0
        ? Math.round(retestWins / retestTrades.length * 1000) / 10
        : 0,
    },
  };

  const isTrades  = trades.filter((t) => t.period === "in-sample");
  const oosTrades = trades.filter((t) => t.period === "out-of-sample");

  result.inSample    = calcStats(isTrades);
  result.outOfSample = calcStats(oosTrades);
  result.combined    = calcStats(trades);

  return result;
}

// ── Printing ──────────────────────────────────────────────────────────────────

function printStats(label: string, s: PeriodStats | null) {
  if (!s) { console.log(`  ${label.padEnd(18)} insufficient data`); return; }
  const wr  = `${String(s.winRate).padStart(5)}%`;
  const pf  = String(s.profitFactor).padStart(5);
  const sh  = String(s.sharpe).padStart(6);
  const dd  = `${String(s.maxDrawdown).padStart(5)}%`;
  const exp = String(s.expectancy).padStart(8);
  const n   = String(s.trades).padStart(5);
  const pm  = `${s.profitableMonths}/${s.totalMonths}mo`;
  console.log(`  ${label.padEnd(18)} n=${n}  WR=${wr}  PF=${pf}  Sharpe=${sh}  DD=${dd}  EV=${exp}R  ${pm}`);
}

function printResult(r: InstrumentResult) {
  const combined = r.combined;
  const verdict = !combined
    ? "⛔ NO DATA"
    : combined.winRate >= 50 && combined.sharpe >= 0.5 && combined.maxDrawdown < 20
    ? "✅ PASS"
    : combined.winRate >= 45 && combined.sharpe >= 0.2
    ? "⚠️  WATCH"
    : "❌ FAIL";

  console.log(`\n  ${r.instrument.padEnd(12)} [${r.dataMonths}mo data]  ${verdict}`);
  printStats("In-sample",      r.inSample);
  printStats("Out-of-sample",  r.outOfSample);
  printStats("Combined",       r.combined);

  if (r.entryBreakdown) {
    const { crossover, retest } = r.entryBreakdown;
    console.log(
      `  ${"Entry breakdown".padEnd(18)} Crossover: n=${crossover.trades} WR=${crossover.winRate}%` +
      `   Retest: n=${retest.trades} WR=${retest.winRate}%`,
    );
  }
}

function printSeparator(label: string) {
  const pad = "─".repeat(Math.max(0, 66 - label.length));
  console.log(`\n  ╔═ ${label} ${pad}╗`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  const instruments = INSTRUMENT_ARG
    ? [INSTRUMENT_ARG]
    : [...SYNTHETIC_INSTRUMENTS];

  console.log("\n╔══════════════════════════════════════════════════════════════════════╗");
  console.log("║              APEX STRATEGY BACKTEST RUNNER                          ║");
  console.log("╚══════════════════════════════════════════════════════════════════════╝");
  console.log(`\n  Instruments : ${instruments.join(", ")}`);
  console.log(`  Strategies  : ${[RUN_SCALP && "ema-scalp", RUN_FLIP && "ema-flip"].filter(Boolean).join(", ")}`);
  console.log(`  OOS split   : ${OOS_SPLIT}`);
  console.log(`  Risk/trade  : ${RISK_PER_TRADE_PCT}%`);
  console.log(`  TP target   : 1.5 R:R  |  SL: strategy-defined EMA level`);

  const allResults: InstrumentResult[] = [];

  // ── Strategy 1: EMA Scalp ─────────────────────────────────────────────────
  if (RUN_SCALP) {
    printSeparator("STRATEGY 1 — EMA SCALP (EMA 25/50/100, M5 pullback retest)");
    console.log(`  Columns: n=trades  WR=win rate  PF=profit factor  Sharpe  DD=max drawdown  EV=expectancy\n`);

    for (const instrument of instruments) {
      process.stdout.write(`  Running ${instrument} ... `);
      try {
        const result = await backtestScalp(instrument);
        allResults.push(result);
        console.log(
          result.combined
            ? `${result.combined.trades} trades  WR=${result.combined.winRate}%  Sharpe=${result.combined.sharpe}`
            : "insufficient data",
        );
        printResult(result);
      } catch (err) {
        console.error(`FAILED — ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  // ── Strategy 2: EMA Flip ──────────────────────────────────────────────────
  if (RUN_FLIP) {
    printSeparator("STRATEGY 2 — EMA FLIP (EMA 21/55/89/200, crossover + retest)");
    console.log(`  Columns: n=trades  WR=win rate  PF=profit factor  Sharpe  DD=max drawdown  EV=expectancy\n`);

    for (const instrument of instruments) {
      process.stdout.write(`  Running ${instrument} ... `);
      try {
        const result = await backtestFlip(instrument);
        allResults.push(result);
        console.log(
          result.combined
            ? `${result.combined.trades} trades  WR=${result.combined.winRate}%  Sharpe=${result.combined.sharpe}`
            : "insufficient data",
        );
        printResult(result);
      } catch (err) {
        console.error(`FAILED — ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const withData = allResults.filter((r) => r.combined !== null);

  if (withData.length > 0) {
    console.log("\n" + "═".repeat(72));
    console.log("  SUMMARY");
    console.log("═".repeat(72));

    for (const strategyName of ["ema-scalp", "ema-flip"]) {
      const group = withData.filter((r) => r.strategy === strategyName);
      if (group.length === 0) continue;

      const passing = group.filter(
        (r) => r.combined!.winRate >= 50 && r.combined!.sharpe >= 0.5 && r.combined!.maxDrawdown < 20,
      );
      const avgWR    = group.reduce((s, r) => s + r.combined!.winRate, 0) / group.length;
      const avgSharpe = group.reduce((s, r) => s + r.combined!.sharpe, 0) / group.length;
      const avgDD    = group.reduce((s, r) => s + r.combined!.maxDrawdown, 0) / group.length;

      console.log(`\n  ${strategyName.toUpperCase()}`);
      console.log(`  Instruments tested  : ${group.length}`);
      console.log(`  Passing (WR≥50% + Sharpe≥0.5 + DD<20%)  : ${passing.length}/${group.length}`);
      console.log(`  Avg win rate        : ${avgWR.toFixed(1)}%`);
      console.log(`  Avg Sharpe          : ${avgSharpe.toFixed(2)}`);
      console.log(`  Avg max drawdown    : ${avgDD.toFixed(1)}%`);

      if (passing.length > 0) {
        console.log(`  Best instruments    : ${passing.map((r) => r.instrument).join(", ")}`);
      }
    }
  }

  // Save full results to JSON
  const outFile = "backtest-results.json";
  writeFileSync(outFile, JSON.stringify(allResults, null, 2));
  console.log(`\n  Full results saved to: ${outFile}`);

  console.log("\n  NOTE: If you see 'insufficient data' for all instruments,");
  console.log("  you need to import historical candle data first:");
  console.log("  pnpm import:deriv   (for synthetic indices)\n");

  process.exit(0);
}

run().catch((err) => {
  console.error("[Backtest] Fatal error:", err);
  process.exit(1);
});
