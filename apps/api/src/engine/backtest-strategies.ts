/**
 * Strategy Backtest Runner
 *
 * Tests Strategy 3 (HTF Structure + Liquidity Sweep + FVG) against
 * historical candle data stored in TimescaleDB.
 *
 * Usage:
 *   pnpm backtest:htf-fvg                            → all synthetic instruments
 *   pnpm backtest:htf-fvg --instrument R_75          → single instrument
 *   pnpm backtest:htf-fvg --instrument R_75 --oos 2025-06-01
 *
 * How it works:
 *   1. Loads M5 bars (entry TF) + H1 and H4 bars (structure TFs)
 *   2. Walks forward through every M5 bar
 *   3. At each bar, evaluates the strategy with look-ahead prevention
 *   4. If a signal fires, simulates trade outcome against next N M5 bars
 *   5. Enforces cooldown after each trade to avoid overlap
 *   6. Reports per-instrument stats + combined portfolio summary
 */

import "dotenv/config";
import { tsdb } from "../db/client.js";
import { candles } from "../db/schema/index.js";
import { and, eq, asc } from "drizzle-orm";
import { evaluateHtfFvgStrategy } from "./strategy/htf-fvg-strategy.js";
import { evaluateMultiTfStrategy } from "./strategy/multi-tf-confluence-strategy.js";
import { evaluatePullbackPoiStrategy } from "./strategy/pullback-poi-strategy.js";
import { MAJOR_PAIRS, MINOR_PAIRS } from "./market-data/instruments.js";
import type { OHLCV } from "./indicators/indicator-engine.js";

// ── Config ────────────────────────────────────────────────────────────────────

// Minimum M5 bars needed before we start evaluating
const WARMUP_BARS = 60;

// How many M5 bars forward to simulate each trade (max trade duration)
// 240 M5 bars = 20 hours — FVG trades can take longer than EMA scalp
const MAX_TRADE_BARS = 240;

// Cooldown bars after a signal fires before evaluating again
// 24 bars = 2 hours at M5 — FVG setups need time to play out
const COOLDOWN_BARS = 24;

// Walk-forward split date
const DEFAULT_OOS_SPLIT = "2025-01-01";

// All instruments to test when none specified — majors first, then minors
const ALL_TESTABLE = [
  ...MAJOR_PAIRS,
  ...MINOR_PAIRS,
] as const;

// ── Types ─────────────────────────────────────────────────────────────────────

type TradeOutcome = "tp" | "sl" | "expired";

type Trade = {
  instrument: string;
  direction:  "buy" | "sell";
  entryPrice: number;
  slPrice:    number;
  tpPrice:    number;
  rrRatio:    number;
  h1Confirms: boolean;
  outcome:    TradeOutcome;
  pnlR:       number;
  barsHeld:   number;
  entryTime:  Date;
  period:     "in-sample" | "out-of-sample";
  month:      string;
};

type PeriodStats = {
  trades:           number;
  wins:             number;
  losses:           number;
  winRate:          number;
  totalR:           number;
  avgR:             number;
  profitFactor:     number;
  maxDrawdownPct:   number;
  sharpe:           number;
  worstStreak:      number;
  profitableMonths: number;
  totalMonths:      number;
  h1ConfirmedWR:    number;
  h1ConfirmedTotal: number;
  h4OnlyWR:         number;
  h4OnlyTotal:      number;
};

// ── DB loaders ────────────────────────────────────────────────────────────────

async function loadBars(
  instrument: string,
  timeframe:  string,
  limit:      number,
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

// Slice HTF bars up to a given M5 bar time (prevents look-ahead bias)
function htfSlice(
  htfBars: (OHLCV & { time: Date })[],
  m5Time:  Date,
  limit:   number,
): OHLCV[] {
  const idx = htfBars.reduce((best, b, i) => b.time <= m5Time ? i : best, -1);
  if (idx < 0) return [];
  const start = Math.max(0, idx - limit + 1);
  return htfBars.slice(start, idx + 1);
}

// ── Trade simulator ───────────────────────────────────────────────────────────

function simulateTrade(
  m5Bars:   (OHLCV & { time: Date })[],
  entryIdx: number,
  direction: "buy" | "sell",
  tpPrice:  number,
  slPrice:  number,
): { outcome: TradeOutcome; barsHeld: number; pnlR: number } {
  const slDist = Math.abs(m5Bars[entryIdx]!.close - slPrice);
  const tpDist = Math.abs(tpPrice - m5Bars[entryIdx]!.close);
  const rrRatio = slDist > 0 ? tpDist / slDist : 0;

  for (let j = entryIdx + 1; j <= entryIdx + MAX_TRADE_BARS && j < m5Bars.length; j++) {
    const bar = m5Bars[j]!;

    if (direction === "buy") {
      if (bar.low  <= slPrice) return { outcome: "sl", barsHeld: j - entryIdx, pnlR: -1.0 };
      if (bar.high >= tpPrice) return { outcome: "tp", barsHeld: j - entryIdx, pnlR: rrRatio };
    } else {
      if (bar.high >= slPrice) return { outcome: "sl", barsHeld: j - entryIdx, pnlR: -1.0 };
      if (bar.low  <= tpPrice) return { outcome: "tp", barsHeld: j - entryIdx, pnlR: rrRatio };
    }
  }

  return { outcome: "expired", barsHeld: MAX_TRADE_BARS, pnlR: 0 };
}

// ── Stats calculator ──────────────────────────────────────────────────────────

function calcStats(trades: Trade[]): PeriodStats | null {
  const closed = trades.filter((t) => t.outcome !== "expired");
  if (closed.length < 5) return null;

  const wins   = closed.filter((t) => t.outcome === "tp");
  const losses = closed.filter((t) => t.outcome === "sl");
  const winRate = wins.length / closed.length;
  const totalR  = closed.reduce((s, t) => s + t.pnlR, 0);
  const avgR    = totalR / closed.length;

  const grossWin  = wins.reduce((s, t) => s + t.pnlR, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnlR, 0));
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 999 : 0;

  // Drawdown
  let equity = 1.0, peak = 1.0, maxDD = 0;
  for (const t of closed) {
    equity *= 1 + t.pnlR * 0.01;
    peak = Math.max(peak, equity);
    maxDD = Math.max(maxDD, (peak - equity) / peak);
  }

  // Annualised Sharpe
  const returns = closed.map((t) => t.pnlR * 0.01);
  const mean    = returns.reduce((s, r) => s + r, 0) / returns.length;
  const std     = Math.sqrt(returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length);
  const sharpe  = std > 0 ? (mean / std) * Math.sqrt(252 * 2) : 0; // ~2 trades/day for FVG

  // Worst consecutive loss streak
  let streak = 0, worstStreak = 0;
  for (const t of closed) {
    streak = t.outcome === "sl" ? streak + 1 : 0;
    worstStreak = Math.max(worstStreak, streak);
  }

  // Monthly breakdown
  const byMonth: Record<string, number> = {};
  for (const t of closed) {
    byMonth[t.month] = (byMonth[t.month] ?? 0) + t.pnlR;
  }
  const months = Object.values(byMonth);

  // H1 confirmation breakdown
  const h1Confirmed = closed.filter((t) => t.h1Confirms);
  const h4Only      = closed.filter((t) => !t.h1Confirms);
  const h1ConfirmedWR = h1Confirmed.length > 0
    ? h1Confirmed.filter((t) => t.outcome === "tp").length / h1Confirmed.length * 100
    : 0;
  const h4OnlyWR = h4Only.length > 0
    ? h4Only.filter((t) => t.outcome === "tp").length / h4Only.length * 100
    : 0;

  return {
    trades:           closed.length,
    wins:             wins.length,
    losses:           losses.length,
    winRate:          Math.round(winRate * 1000) / 10,
    totalR:           Math.round(totalR  * 100) / 100,
    avgR:             Math.round(avgR    * 1000) / 1000,
    profitFactor:     Math.round(profitFactor * 100) / 100,
    maxDrawdownPct:   Math.round(maxDD * 1000) / 10,
    sharpe:           Math.round(sharpe * 100) / 100,
    worstStreak,
    profitableMonths: months.filter((r) => r > 0).length,
    totalMonths:      months.length,
    h1ConfirmedWR:    Math.round(h1ConfirmedWR * 10) / 10,
    h1ConfirmedTotal: h1Confirmed.length,
    h4OnlyWR:         Math.round(h4OnlyWR * 10) / 10,
    h4OnlyTotal:      h4Only.length,
  };
}

// ── HTF FVG backtest ──────────────────────────────────────────────────────────

async function backtestHtfFvg(
  instrument: string,
  oosSplit:   Date,
): Promise<Trade[]> {
  const [m5, h1, h4] = await Promise.all([
    loadBars(instrument, "M5",  50_000),
    loadBars(instrument, "H1",   5_000),
    loadBars(instrument, "H4",   3_000),
  ]);

  if (m5.length < WARMUP_BARS + MAX_TRADE_BARS) return [];

  const trades: Trade[] = [];
  let lastSignalBar = -COOLDOWN_BARS - 1;

  for (let i = WARMUP_BARS; i < m5.length - MAX_TRADE_BARS; i++) {
    if (i - lastSignalBar <= COOLDOWN_BARS) continue;

    const barTime  = m5[i]!.time;
    const m5Window = m5.slice(Math.max(0, i - 250), i + 1);
    const h1Window = htfSlice(h1, barTime, 80);   // 80 H1 bars = ~3 days
    const h4Window = htfSlice(h4, barTime, 40);   // 40 H4 bars = ~7 weeks

    const result = evaluateHtfFvgStrategy(m5Window, h1Window, h4Window);
    if (!result.valid) continue;

    const { direction, entryPrice, slPrice, tpPrice, rrRatio, h1Confirms } = result;
    const sim = simulateTrade(m5, i, direction, tpPrice, slPrice);

    trades.push({
      instrument, direction, entryPrice, slPrice, tpPrice, rrRatio,
      h1Confirms,
      outcome:   sim.outcome,
      pnlR:      sim.pnlR,
      barsHeld:  sim.barsHeld,
      entryTime: barTime,
      period:    barTime >= oosSplit ? "out-of-sample" : "in-sample",
      month:     barTime.toISOString().slice(0, 7),
    });

    lastSignalBar = i;
  }

  return trades;
}

// ── Multi-TF Confluence backtest (Strategy 2) ─────────────────────────────────

async function backtestMultiTf(
  instrument: string,
  oosSplit:   Date,
): Promise<Trade[]> {
  const [m30, h1, h4, d1] = await Promise.all([
    loadBars(instrument, "M30", 30_000),
    loadBars(instrument, "H1",   5_000),
    loadBars(instrument, "H4",   3_000),
    loadBars(instrument, "D1",   2_000),
  ]);

  if (m30.length < WARMUP_BARS + MAX_TRADE_BARS) return [];

  const trades: Trade[] = [];
  let lastSignalBar = -COOLDOWN_BARS - 1;

  for (let i = WARMUP_BARS; i < m30.length - MAX_TRADE_BARS; i++) {
    if (i - lastSignalBar <= COOLDOWN_BARS) continue;

    const barTime   = m30[i]!.time;
    const m30Window = m30.slice(Math.max(0, i - 100), i + 1);
    const h1Window  = htfSlice(h1,  barTime, 30);   // 30 H1 bars = ~30 hours recent leg
    const h4Window  = htfSlice(h4,  barTime, 40);   // 40 H4 bars = ~7 weeks
    const d1Window  = htfSlice(d1,  barTime, 65);   // 65 D1 bars = ~3 months

    const result = evaluateMultiTfStrategy(m30Window, h1Window, h4Window, d1Window);
    if (!result.valid) continue;

    const { direction, entryPrice, slPrice, tpPrice, rrRatio } = result;
    const sim = simulateTrade(m30, i, direction, tpPrice, slPrice);

    trades.push({
      instrument, direction, entryPrice, slPrice, tpPrice, rrRatio,
      h1Confirms: result.d1Bias !== "none", // use D1 availability as quality flag
      outcome:   sim.outcome,
      pnlR:      sim.pnlR,
      barsHeld:  sim.barsHeld,
      entryTime: barTime,
      period:    barTime >= oosSplit ? "out-of-sample" : "in-sample",
      month:     barTime.toISOString().slice(0, 7),
    });

    lastSignalBar = i;
  }

  return trades;
}

// ── Pullback POI backtest (Strategy 3) ───────────────────────────────────────

async function backtestPullback(
  instrument: string,
  oosSplit:   Date,
): Promise<Trade[]> {
  const [m5, h1] = await Promise.all([
    loadBars(instrument, "M5",  50_000),
    loadBars(instrument, "H1",   5_000),
  ]);

  if (m5.length < WARMUP_BARS + MAX_TRADE_BARS) return [];

  const trades: Trade[] = [];
  let lastSignalBar = -COOLDOWN_BARS - 1;

  for (let i = WARMUP_BARS; i < m5.length - MAX_TRADE_BARS; i++) {
    if (i - lastSignalBar <= COOLDOWN_BARS) continue;

    const barTime   = m5[i]!.time;
    const m5Window  = m5.slice(Math.max(0, i - 100), i + 1);
    const h1Window  = htfSlice(h1, barTime, 30);   // 30 H1 bars = recent leg only

    const result = evaluatePullbackPoiStrategy(m5Window, h1Window);
    if (!result.valid) continue;

    const { direction, entryPrice, slPrice, tpPrice, rrRatio, ltfConfirmed } = result;
    const sim = simulateTrade(m5, i, direction, tpPrice, slPrice);

    trades.push({
      instrument, direction, entryPrice, slPrice, tpPrice, rrRatio,
      h1Confirms: ltfConfirmed, // reuse field to track LTF confirmation quality
      outcome:   sim.outcome,
      pnlR:      sim.pnlR,
      barsHeld:  sim.barsHeld,
      entryTime: barTime,
      period:    barTime >= oosSplit ? "out-of-sample" : "in-sample",
      month:     barTime.toISOString().slice(0, 7),
    });

    lastSignalBar = i;
  }

  return trades;
}

// ── Report printer ────────────────────────────────────────────────────────────
function printStats(label: string, stats: PeriodStats | null) {
  if (!stats) { console.log(`    ${label}: insufficient data`); return; }

  const verdict = stats.winRate >= 50 && stats.profitFactor >= 1.2 && stats.maxDrawdownPct < 25 ? "✅" : "❌";
  console.log(
    `    ${label.padEnd(16)} ${verdict}  n=${String(stats.trades).padStart(4)} | WR=${String(stats.winRate).padStart(5)}% | PF=${String(stats.profitFactor).padStart(5)} | R=${String(stats.totalR.toFixed(1)).padStart(8)} | DD=${String(stats.maxDrawdownPct).padStart(5)}% | Sharpe=${stats.sharpe.toFixed(2)} | streak=${stats.worstStreak} | months=${stats.profitableMonths}/${stats.totalMonths}`,
  );
  // H1 confirmation breakdown — key insight
  if (stats.h1ConfirmedTotal > 0 || stats.h4OnlyTotal > 0) {
    console.log(
      `                        └─ H4+H1: n=${stats.h1ConfirmedTotal} WR=${stats.h1ConfirmedWR}%  |  H4 only: n=${stats.h4OnlyTotal} WR=${stats.h4OnlyWR}%`,
    );
  }
}

function printMonthly(trades: Trade[]) {
  const byMonth: Record<string, Trade[]> = {};
  for (const t of trades.filter((t) => t.outcome !== "expired")) {
    (byMonth[t.month] ??= []).push(t);
  }

  console.log(`\n    ${"Month".padEnd(8)} ${"n".padStart(5)} ${"WR".padStart(7)} ${"R".padStart(8)}  Period`);
  console.log(`    ${"-".repeat(45)}`);

  for (const [month, ts] of Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b))) {
    const wins   = ts.filter((t) => t.outcome === "tp").length;
    const wr     = ((wins / ts.length) * 100).toFixed(1);
    const totalR = ts.reduce((s, t) => s + t.pnlR, 0).toFixed(2);
    const sign   = parseFloat(totalR) >= 0 ? "+" : "";
    const period = ts[0]!.period === "out-of-sample" ? "OOS" : "IS ";
    const flag   = parseFloat(totalR) >= 0 ? "  " : "XX";
    console.log(`    ${flag} ${month}  ${String(ts.length).padStart(4)} ${wr.padStart(6)}%  ${sign}${String(totalR).padStart(7)}R  ${period}`);
  }
}

// ── CLI arg parser ────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  let instrument: string | null = null;
  let oos = DEFAULT_OOS_SPLIT;
  let strategy: "htf-fvg" | "multi-tf" | "pullback" = "htf-fvg";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--instrument" && args[i + 1]) instrument = args[++i]!;
    if (args[i] === "--oos"        && args[i + 1]) oos        = args[++i]!;
    if (args[i] === "--strategy"   && args[i + 1]) {
      const v = args[++i]!;
      if (v === "multi-tf")  strategy = "multi-tf";
      if (v === "pullback")  strategy = "pullback";
    }
  }

  return { instrument, oos, strategy };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  const { instrument: cliInstrument, oos: cliOos, strategy } = parseArgs();
  const defaultOosSplit = new Date(cliOos);
  const instruments = cliInstrument ? [cliInstrument] : [...ALL_TESTABLE];

  const strategyLabel = strategy === "multi-tf"
    ? "Strategy 2: Multi-TF Confluence (D1/H4 + H1 OB/Breaker + M30 Entry)"
    : strategy === "pullback"
    ? "Strategy 3: Pullback POI (HTF trend + Unmitigated POI + LTF confirm)"
    : "Strategy 1: HTF Structure + FVG Entry (H4 structure + M5 FVG)";

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log(`║  APEX Backtest — ${strategyLabel.slice(0, 45).padEnd(45)}║`);
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`\n  Strategy     : ${strategyLabel}`);
  console.log(`  Instruments  : ${instruments.join(", ")}`);
  console.log(`  OOS split    : ${cliOos}`);
  console.log(`  Max bars/trade: ${MAX_TRADE_BARS} bars (${MAX_TRADE_BARS * (strategy === "multi-tf" ? 30 : 5)} min)\n`);

  const allTrades: Trade[] = [];

  for (const inst of instruments) {
    // Check data availability
    const sampleBars = await loadBars(inst, "M5", WARMUP_BARS + 10);
    if (sampleBars.length < WARMUP_BARS) {
      console.log(`  ${inst.padEnd(14)} no M5 data — run: pnpm import:dukascopy (or pnpm import:historical)`);
      continue;
    }

    // Auto-adjust OOS split if data starts after the default
    const dataStart   = sampleBars[0]!.time;
    let oosSplit = defaultOosSplit;
    if (oosSplit <= dataStart) {
      const allM5   = await loadBars(inst, "M5", 50_000);
      const dataEnd = allM5[allM5.length - 1]!.time;
      const rangeMs = dataEnd.getTime() - dataStart.getTime();
      oosSplit = new Date(dataStart.getTime() + rangeMs * 0.7);
      console.log(`  ${inst.padEnd(14)} data from ${dataStart.toISOString().slice(0,10)} — OOS split → ${oosSplit.toISOString().slice(0,10)}`);
    }

    process.stdout.write(`  ${inst.padEnd(14)} loading ... `);

    let trades: Trade[];
    try {
      trades = strategy === "multi-tf"
        ? await backtestMultiTf(inst, oosSplit)
        : strategy === "pullback"
        ? await backtestPullback(inst, oosSplit)
        : await backtestHtfFvg(inst, oosSplit);
    } catch (err) {
      console.error(`FAILED — ${err instanceof Error ? err.message : err}`);
      continue;
    }

    const closed = trades.filter((t) => t.outcome !== "expired");
    if (closed.length === 0) {
      console.log("no trades generated (conditions never met — check data)");
      continue;
    }

    console.log(`${closed.length} trades`);

    const isTrades  = trades.filter((t) => t.period === "in-sample");
    const oosTrades = trades.filter((t) => t.period === "out-of-sample");

    printStats("In-sample",     calcStats(isTrades));
    printStats("Out-of-sample", calcStats(oosTrades));

    allTrades.push(...trades);
  }

  if (allTrades.length === 0) {
    console.log("\n  No trades generated. Import historical forex data first:");
    console.log("  pnpm import:dukascopy   ← imports H1/H4/D1 for all major pairs");
    console.log("  pnpm import:historical  ← imports M5/M15/M30 via TwelveData\n");
    process.exit(0);
  }

  // ── Portfolio summary ──────────────────────────────────────────────────────
  const combined    = calcStats(allTrades);
  const oosCombined = calcStats(allTrades.filter((t) => t.period === "out-of-sample"));

  console.log("\n" + "═".repeat(75));
  console.log("  PORTFOLIO SUMMARY");
  console.log("═".repeat(75));
  printStats("Combined",  combined);
  printStats("OOS only",  oosCombined);

  // ── Direction split ────────────────────────────────────────────────────────
  const buys  = allTrades.filter((t) => t.direction === "buy"  && t.outcome !== "expired");
  const sells = allTrades.filter((t) => t.direction === "sell" && t.outcome !== "expired");
  const buyWR  = buys.length  > 0 ? (buys.filter( (t) => t.outcome === "tp").length / buys.length  * 100).toFixed(1) : "n/a";
  const sellWR = sells.length > 0 ? (sells.filter((t) => t.outcome === "tp").length / sells.length * 100).toFixed(1) : "n/a";

  console.log(`\n  Direction split:`);
  console.log(`    BUY  n=${String(buys.length).padStart(4)}  WR=${buyWR}%`);
  console.log(`    SELL n=${String(sells.length).padStart(4)}  WR=${sellWR}%`);

  // ── Monthly breakdown ──────────────────────────────────────────────────────
  if (instruments.length === 1) {
    console.log("\n  Monthly breakdown:");
    printMonthly(allTrades);
  }

  // ── Verdict ────────────────────────────────────────────────────────────────
  const ready = combined !== null
    && combined.winRate >= 50
    && combined.profitFactor >= 1.2
    && combined.maxDrawdownPct < 25
    && combined.worstStreak <= 10
    && (oosCombined ? oosCombined.winRate >= 48 : true);

  console.log("\n" + "═".repeat(75));
  console.log("  VERDICT");
  console.log("═".repeat(75));
  if (combined) {
    console.log(`  Win rate        ${combined.winRate}%   ${combined.winRate >= 50 ? "✅" : "❌"} (need ≥ 50%)`);
    console.log(`  Profit factor   ${combined.profitFactor}    ${combined.profitFactor >= 1.2 ? "✅" : "❌"} (need ≥ 1.2)`);
    console.log(`  Max drawdown    ${combined.maxDrawdownPct}%   ${combined.maxDrawdownPct < 25 ? "✅" : "❌"} (need < 25%)`);
    console.log(`  Worst streak    ${combined.worstStreak}       ${combined.worstStreak <= 10 ? "✅" : "❌"} (need ≤ 10)`);
    if (oosCombined) {
      console.log(`  OOS win rate    ${oosCombined.winRate}%   ${oosCombined.winRate >= 48 ? "✅" : "❌"} (need ≥ 48%)`);
    }
    console.log(`\n  RESULT: ${ready ? "✅ STRATEGY PASSES — ready for paper trading" : "❌ NEEDS TUNING — review failing checks"}\n`);
  }

  process.exit(0);
}

run().catch((err) => {
  console.error("Backtest failed:", err);
  process.exit(1);
});
