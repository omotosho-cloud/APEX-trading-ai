import "dotenv/config";
import { tsdb } from "../db/client.js";
import { candles } from "../db/schema/index.js";
import { and, eq, asc, sql } from "drizzle-orm";
import { calculateIndicators } from "./indicators/indicator-engine.js";
import { classifyRaw } from "./regime/regime-classifier.js";
import { calculateSignalLevels } from "./signal/tp-sl-engine.js";
import { technicalExpert } from "./experts/technical-expert.js";
import { smartMoneyExpert } from "./experts/smart-money-expert.js";
import { macroExpert } from "./experts/macro-expert.js";
import { sanityCheckExpert, applySanityCap } from "./experts/sanity-check.js";
import { BASE_WEIGHTS, getRegimeWeights } from "./backtest-helpers.js";
import { ALL_INSTRUMENTS, ALL_TIMEFRAMES } from "./market-data/instruments.js";
import { writeFileSync } from "fs";
import type { OHLCV } from "./indicators/indicator-engine.js";
import type { Regime } from "@apex/types";

// ── Tuned engine parameters ───────────────────────────────────────────────────
const MIN_CONFIDENCE   = 55;   // was 60 — allows more signals, especially on shorter TFs
const MIN_REGIME_CONF  = 55;   // was 60 — same rationale
const ATR_RATIO_GATE   = 1.6;  // was 1.8 — tighter volatility filter
const LOOKBACK         = 250;
const RISK_PER_TRADE   = 0.01;
const WALKFORWARD_SPLIT = "2025-01-01";

// Per-timeframe: forward bars to simulate outcome + cooldown between signals
const TF_CONFIG: Record<string, { forwardBars: number; cooldown: number }> = {
  M5:  { forwardBars: 24,  cooldown: 3 },
  M15: { forwardBars: 32,  cooldown: 3 },
  M30: { forwardBars: 48,  cooldown: 3 },
  H1:  { forwardBars: 72,  cooldown: 4 },
  H4:  { forwardBars: 120, cooldown: 5 },
  D1:  { forwardBars: 60,  cooldown: 5 },
  W1:  { forwardBars: 24,  cooldown: 3 },
};

type Trade = {
  instrument: string;
  timeframe: string;
  direction: "buy" | "sell";
  regime: Regime;
  confidence: number;
  rrRatio: number;
  outcome: "tp1" | "tp2" | "tp3" | "sl" | "expired";
  pnlR: number;
  month: string;
  barsToClose: number;
  period: "in-sample" | "out-of-sample";
};

type PeriodStats = {
  trades: number;
  wins: number;
  winRate: number;
  sharpe: number;
  maxDrawdown: number;
  profitFactor: number;
  expectancy: number;
  totalR: number;
  profitableMonths: number;
  totalMonths: number;
};

type PairResult = {
  instrument: string;
  timeframe: string;
  dataYears: number;
  inSample: PeriodStats;
  outOfSample: PeriodStats | null;
  combined: PeriodStats;
  passes: boolean;
  strongOOS: boolean;
};

function sentimentStub(instrument: string, ind: ReturnType<typeof calculateIndicators>) {
  const isCrypto = ["BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT","XRPUSDT"].includes(instrument);
  if (isCrypto) return { direction: "neutral" as const, confidence: 50, reasoning: "backtest" };
  if (ind.rsi > 60) return { direction: "buy"  as const, confidence: 58, reasoning: `RSI ${ind.rsi.toFixed(0)}` };
  if (ind.rsi < 40) return { direction: "sell" as const, confidence: 58, reasoning: `RSI ${ind.rsi.toFixed(0)}` };
  return { direction: "neutral" as const, confidence: 50, reasoning: "neutral" };
}

function quantStub() {
  return { direction: "neutral" as const, confidence: 50, reasoning: "no history" };
}

function getWeights(instrument: string, timeframe: string, regime: Regime) {
  const w = { ...BASE_WEIGHTS };
  const adj = getRegimeWeights(regime, timeframe, instrument);
  for (const k of Object.keys(w) as (keyof typeof w)[]) w[k] = Math.max(0, w[k]! + (adj[k] ?? 0));
  const total = Object.values(w).reduce((s, v) => s + v, 0);
  for (const k of Object.keys(w) as (keyof typeof w)[]) w[k]! /= total;
  return w;
}

function riskManager(rrRatio: number, atrRatio: number, confidence: number) {
  if (rrRatio < 1.2) return { approved: false, confidence };
  if (confidence < MIN_CONFIDENCE) return { approved: false, confidence };
  let adj = confidence;
  if (atrRatio > ATR_RATIO_GATE) adj -= 5;
  return { approved: adj >= MIN_CONFIDENCE, confidence: Math.round(adj) };
}

async function simulatePair(instrument: string, timeframe: string): Promise<Trade[]> {
  const { forwardBars, cooldown } = TF_CONFIG[timeframe] ?? TF_CONFIG["H4"]!;

  const rows = await tsdb
    .select()
    .from(candles)
    .where(and(eq(candles.instrument, instrument), eq(candles.timeframe, timeframe)))
    .orderBy(asc(candles.time))
    .limit(50_000);

  if (rows.length < LOOKBACK + forwardBars + 10) return [];

  const bars: (OHLCV & { time: Date })[] = rows.map((r) => ({
    open: parseFloat(r.open), high: parseFloat(r.high),
    low:  parseFloat(r.low),  close: parseFloat(r.close),
    volume: parseFloat(r.volume), time: new Date(r.time),
  }));

  const splitDate = new Date(WALKFORWARD_SPLIT);
  const trades: Trade[] = [];
  let lastSignalBar = -999;

  for (let i = LOOKBACK; i < bars.length - forwardBars; i++) {
    if (i - lastSignalBar < cooldown) continue;

    const barTime = bars[i]!.time;
    const h = barTime.getUTCHours();
    const session =
      h >= 13 && h < 17 ? "london_ny_overlap" :
      h >= 8  && h < 13 ? "london" :
      h >= 17 && h < 22 ? "new_york" :
      h >= 0  && h < 8  ? "tokyo" : "closed";
    if (session === "closed") continue;

    const window = bars.slice(i - LOOKBACK, i);
    const ind = calculateIndicators(window);

    const { regime, confidence: regimeConf } = classifyRaw(
      ind.adx, ind.hurst, ind.atrRatio, ind.bbBandwidth,
      ind.structureScore, ind.efficiencyRatio, ind.plusDI, ind.minusDI,
    );

    if (regime === "choppy") continue;
    if (regimeConf < MIN_REGIME_CONF) continue;

    const price = bars[i]!.close;
    const weights = getWeights(instrument, timeframe, regime);

    const votes = {
      technical:   technicalExpert(ind, regime, price),
      smart_money: smartMoneyExpert(window, ind, price, timeframe),
      sentiment:   sentimentStub(instrument, ind),
      macro:       macroExpert(instrument, timeframe, ind, regime),
      quant:       quantStub(),
    };

    const threshold = regime === "breakout_imminent" ? 45 : regime === "volatile" || regime === "ranging" ? 65 : 60;
    let buyScore = 0, sellScore = 0;
    for (const [name, vote] of Object.entries(votes)) {
      const w = weights[name as keyof typeof weights] ?? 0;
      if (vote.direction === "buy")  buyScore  += w * vote.confidence;
      if (vote.direction === "sell") sellScore += w * vote.confidence;
    }

    let direction: "buy" | "sell";
    let rawConf: number;
    if (buyScore > sellScore && buyScore > threshold)       { direction = "buy";  rawConf = Math.round(buyScore); }
    else if (sellScore > buyScore && sellScore > threshold) { direction = "sell"; rawConf = Math.round(sellScore); }
    else continue;

    const sanity = sanityCheckExpert(direction, ind);
    const { confidence: conf } = applySanityCap(direction, rawConf, sanity);

    const levels = calculateSignalLevels(instrument, timeframe, direction, price, ind.atr, regime);
    if (!levels.passes) continue;

    const risk = riskManager(levels.rrRatio, ind.atrRatio, conf);
    if (!risk.approved) continue;

    lastSignalBar = i;

    let outcome: "tp1" | "tp2" | "tp3" | "sl" | "expired" = "expired";
    let barsToClose = forwardBars;
    for (let j = i + 1; j <= i + forwardBars && j < bars.length; j++) {
      const bar = bars[j]!;
      if (direction === "buy") {
        if (bar.low  <= levels.slPrice)                     { outcome = "sl";  barsToClose = j - i; break; }
        if (levels.tp3Price && bar.high >= levels.tp3Price) { outcome = "tp3"; barsToClose = j - i; break; }
        if (bar.high >= levels.tp2Price)                    { outcome = "tp2"; barsToClose = j - i; break; }
        if (bar.high >= levels.tp1Price)                    { outcome = "tp1"; barsToClose = j - i; break; }
      } else {
        if (bar.high >= levels.slPrice)                    { outcome = "sl";  barsToClose = j - i; break; }
        if (levels.tp3Price && bar.low <= levels.tp3Price) { outcome = "tp3"; barsToClose = j - i; break; }
        if (bar.low  <= levels.tp2Price)                   { outcome = "tp2"; barsToClose = j - i; break; }
        if (bar.low  <= levels.tp1Price)                   { outcome = "tp1"; barsToClose = j - i; break; }
      }
    }

    const rr1 = levels.rrRatio;
    const rr2 = levels.rrRatio * 2;
    const rr3 = levels.tp3Price
      ? Math.abs(levels.tp3Price - levels.entryPrice) / Math.abs(levels.slPrice - levels.entryPrice)
      : rr2 * 1.5;

    const pnlR =
      outcome === "tp3" ? (0.5 * rr1 + 0.3 * rr2 + 0.2 * rr3) * RISK_PER_TRADE * 100 :
      outcome === "tp2" ? (0.5 * rr1 + 0.5 * rr2)              * RISK_PER_TRADE * 100 :
      outcome === "tp1" ? (0.5 * rr1 + 0.5 * rr1)              * RISK_PER_TRADE * 100 :
      outcome === "sl"  ? -1 : -0.2;

    trades.push({
      instrument, timeframe, direction, regime,
      confidence: risk.confidence,
      rrRatio: levels.rrRatio,
      outcome, pnlR,
      month: barTime.toISOString().slice(0, 7),
      barsToClose,
      period: barTime >= splitDate ? "out-of-sample" : "in-sample",
    });
  }

  return trades;
}

function calcPeriodStats(trades: Trade[]): PeriodStats | null {
  if (trades.length < 10) return null;

  const wins   = trades.filter((t) => t.outcome === "tp1" || t.outcome === "tp2" || t.outcome === "tp3");
  const losses = trades.filter((t) => t.outcome === "sl");
  const winRate = wins.length / trades.length;
  const returns = trades.map((t) => t.pnlR / 100);
  const avgR    = returns.reduce((a, b) => a + b, 0) / returns.length;
  const totalR  = returns.reduce((a, b) => a + b, 0);

  let equity = 1.0, peak = 1.0, maxDD = 0;
  for (const r of returns) {
    equity *= 1 + r; peak = Math.max(peak, equity);
    maxDD = Math.max(maxDD, (peak - equity) / peak);
  }

  const std = Math.sqrt(returns.reduce((s, r) => s + (r - avgR) ** 2, 0) / returns.length);
  const sharpe = std > 0 ? (avgR / std) * Math.sqrt(252) : 0;
  const grossWin  = wins.reduce((s, t) => s + t.pnlR, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnlR, 0));
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 999 : 0;
  const expectancy = winRate * (grossWin / (wins.length || 1)) - (1 - winRate) * (grossLoss / (losses.length || 1));

  const byMonth: Record<string, number> = {};
  for (const t of trades) byMonth[t.month] = (byMonth[t.month] ?? 0) + t.pnlR;
  const months = Object.values(byMonth);

  return {
    trades: trades.length, wins: wins.length,
    winRate:          Math.round(winRate * 1000) / 10,
    sharpe:           Math.round(sharpe * 100) / 100,
    maxDrawdown:      Math.round(maxDD * 1000) / 10,
    profitFactor:     Math.round(profitFactor * 100) / 100,
    expectancy:       Math.round(expectancy * 100) / 100,
    totalR:           Math.round(totalR * 100) / 100,
    profitableMonths: months.filter((r) => r > 0).length,
    totalMonths:      months.length,
  };
}

function meetsCriteria(s: PeriodStats): boolean {
  return s.winRate >= 48 && s.sharpe > 0.5 && s.maxDrawdown < 20 && s.profitFactor > 1.1;
}

async function run() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║   APEX ALL-TIMEFRAME BACKTEST — WALK-FORWARD VALIDATION  ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`\nTimeframes: ${ALL_TIMEFRAMES.join(", ")}  |  In-sample: pre-2025  |  OOS: 2025+`);
  console.log(`Instruments: ${ALL_INSTRUMENTS.join(", ")}\n`);
  console.log(`Parameters: MIN_CONFIDENCE=${MIN_CONFIDENCE} | MIN_REGIME_CONF=${MIN_REGIME_CONF} | ATR_RATIO_GATE=${ATR_RATIO_GATE}\n`);

  const allTrades: Trade[] = [];
  const results: PairResult[] = [];

  // Fetch data coverage info for all TF/instrument combos in one query
  const dataInfo = await tsdb
    .select({
      instrument: candles.instrument,
      timeframe: candles.timeframe,
      years: sql<string>`ROUND(EXTRACT(EPOCH FROM (MAX(time) - MIN(time))) / 86400 / 365, 1)`,
    })
    .from(candles)
    .groupBy(candles.instrument, candles.timeframe);

  const yearsMap: Record<string, number> = {};
  for (const r of dataInfo) yearsMap[`${r.instrument}:${r.timeframe}`] = parseFloat(r.years ?? "0");

  for (const timeframe of ALL_TIMEFRAMES) {
    console.log(`\n── ${timeframe} ${"─".repeat(60)}`);

    for (const instrument of ALL_INSTRUMENTS) {
      const dataYears = yearsMap[`${instrument}:${timeframe}`] ?? 0;
      process.stdout.write(`  ${instrument.padEnd(10)} [${dataYears}y] ... `);

      try {
        const trades = await simulatePair(instrument, timeframe);
        const isTrades  = trades.filter((t) => t.period === "in-sample");
        const oosTrades = trades.filter((t) => t.period === "out-of-sample");

        const inSample    = calcPeriodStats(isTrades);
        const outOfSample = calcPeriodStats(oosTrades);
        const combined    = calcPeriodStats(trades);

        if (!inSample || !combined) { console.log(`insufficient data (${trades.length} trades)`); continue; }

        allTrades.push(...trades);

        const passes    = meetsCriteria(inSample) && (outOfSample ? meetsCriteria(outOfSample) : false);
        const strongOOS = !passes && outOfSample !== null && outOfSample.winRate >= 50 && outOfSample.sharpe >= 1.0;

        results.push({ instrument, timeframe, dataYears, inSample, outOfSample, combined, passes, strongOOS });

        const v = passes ? "✅" : strongOOS ? "⚠️ " : "❌";
        const oos = outOfSample ? `OOS: WR=${outOfSample.winRate}% Sharpe=${outOfSample.sharpe}` : "OOS: n/a";
        console.log(`${v} IS: WR=${inSample.winRate}% Sharpe=${inSample.sharpe} DD=${inSample.maxDrawdown}%  |  ${oos}`);
      } catch (err) {
        console.error(`FAILED — ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  if (allTrades.length === 0) { console.log("\n⚠️  No trades generated."); process.exit(0); }

  // ── Timeframe summary ──────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(70));
  console.log("  TIMEFRAME SUMMARY");
  console.log("=".repeat(70));
  console.log(`  ${"TF".padEnd(5)} ${"Pairs".padStart(6)} ${"Trades".padStart(8)} ${"WR".padStart(7)} ${"Sharpe".padStart(8)} ${"DD".padStart(7)} ${"PF".padStart(7)}`);
  console.log("  " + "-".repeat(52));
  for (const tf of ALL_TIMEFRAMES) {
    const tfTrades = allTrades.filter((t) => t.timeframe === tf);
    const s = calcPeriodStats(tfTrades);
    if (!s) { console.log(`  ${tf.padEnd(5)} — no data`); continue; }
    const tfPairs = new Set(tfTrades.map((t) => t.instrument)).size;
    const v = s.winRate >= 48 && s.sharpe > 0.5 ? "✅" : "❌";
    console.log(
      `  ${v} ${tf.padEnd(4)} ${String(tfPairs).padStart(5)} ${String(s.trades).padStart(8)} ` +
      `${String(s.winRate).padStart(6)}% ${String(s.sharpe).padStart(8)} ${String(s.maxDrawdown).padStart(6)}% ${String(s.profitFactor).padStart(7)}`,
    );
  }

  // ── Regime breakdown ───────────────────────────────────────────────────────
  const byRegime: Record<string, Trade[]> = {};
  for (const t of allTrades) (byRegime[t.regime] ??= []).push(t);

  console.log("\n" + "=".repeat(70));
  console.log("  REGIME BREAKDOWN");
  console.log("=".repeat(70));
  for (const [regime, ts] of Object.entries(byRegime).sort((a, b) => b[1].length - a[1].length)) {
    const wins = ts.filter((t) => t.outcome === "tp1" || t.outcome === "tp2" || t.outcome === "tp3").length;
    const wr   = Math.round(wins / ts.length * 1000) / 10;
    const avgR = Math.round(ts.reduce((s, t) => s + t.pnlR, 0) / ts.length * 100) / 100;
    console.log(`  ${regime.padEnd(22)} n=${String(ts.length).padStart(5)} | WR=${String(wr).padStart(5)}% | avgR=${String(avgR).padStart(5)}`);
  }

  // ── Combined stats + stress test ───────────────────────────────────────────
  const byMonth: Record<string, Trade[]> = {};
  for (const t of allTrades) (byMonth[t.month] ??= []).push(t);
  const monthly = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, ts]) => {
      const wins   = ts.filter((t) => t.outcome === "tp1" || t.outcome === "tp2" || t.outcome === "tp3").length;
      const totalR = ts.reduce((s, t) => s + t.pnlR, 0);
      return { month, trades: ts.length, wins, winRate: Math.round(wins/ts.length*1000)/10, totalR: Math.round(totalR*100)/100 };
    });

  let worstStreak = 0, streak = 0;
  for (const t of allTrades) {
    if (t.outcome === "sl") { streak++; worstStreak = Math.max(worstStreak, streak); }
    else streak = 0;
  }
  const returns = allTrades.map((t) => t.pnlR / 100);
  const sorted  = [...returns].sort((a, b) => a - b);
  const var95   = sorted[Math.floor(sorted.length * 0.05)] ?? 0;
  const profitableMonths = monthly.filter((m) => m.totalR > 0).length;

  const combinedStats = calcPeriodStats(allTrades)!;
  const oosStats      = calcPeriodStats(allTrades.filter((t) => t.period === "out-of-sample"));
  const passingPairs  = results.filter((r) => r.passes);
  const strongOOSPairs = results.filter((r) => r.strongOOS);

  console.log("\n" + "=".repeat(70));
  console.log("  STRESS TEST");
  console.log("=".repeat(70));
  console.log(`  Worst consecutive losses:  ${worstStreak}  ${worstStreak <= 12 ? "OK" : "FAIL"} (need <=12)`);
  console.log(`  VaR 95% per trade:         ${(var95 * 100).toFixed(2)}%`);
  console.log(`  Profitable months:         ${profitableMonths}/${monthly.length} (${(profitableMonths/monthly.length*100).toFixed(0)}%)  ${profitableMonths/monthly.length >= 0.55 ? "OK" : "FAIL"} (need >=55%)`);

  const ready =
    passingPairs.length >= 2 &&
    combinedStats.winRate >= 48 &&
    combinedStats.sharpe >= 0.5 &&
    combinedStats.maxDrawdown < 26 &&
    worstStreak <= 15 &&
    profitableMonths / monthly.length >= 0.55 &&
    (oosStats ? oosStats.winRate >= 48 && oosStats.sharpe >= 0.5 : false);

  console.log("\n" + "=".repeat(70));
  console.log("  LIVE READINESS VERDICT");
  console.log("=".repeat(70));
  console.log(`  Combos passing IS+OOS:   ${passingPairs.length}/${results.length}  ${passingPairs.length >= 2 ? "OK" : "FAIL"} (need >=2)`);
  console.log(`  Combined win rate:       ${combinedStats.winRate}%  ${combinedStats.winRate >= 48 ? "OK" : "FAIL"} (need >=48%)`);
  console.log(`  Combined Sharpe:         ${combinedStats.sharpe}   ${combinedStats.sharpe >= 0.5 ? "OK" : "FAIL"} (need >=0.5)`);
  console.log(`  Max drawdown:            ${combinedStats.maxDrawdown}%  ${combinedStats.maxDrawdown < 26 ? "OK" : "FAIL"} (need <26%)`);
  console.log(`  Worst loss streak:       ${worstStreak}    ${worstStreak <= 15 ? "OK" : "FAIL"} (need <=15)`);
  console.log(`  Profitable months:       ${(profitableMonths/monthly.length*100).toFixed(0)}%  ${profitableMonths/monthly.length >= 0.55 ? "OK" : "FAIL"} (need >=55%)`);
  if (oosStats) {
    console.log(`  OOS win rate (2025+):    ${oosStats.winRate}%  ${oosStats.winRate >= 48 ? "OK" : "FAIL"} (need >=48%)`);
    console.log(`  OOS Sharpe (2025+):      ${oosStats.sharpe}   ${oosStats.sharpe >= 0.5 ? "OK" : "FAIL"} (need >=0.5)`);
  }

  console.log(`\n  VERDICT: ${ready ? "READY FOR LIVE TRADING" : "NOT READY — see failing checks above"}`);

  if (passingPairs.length > 0) {
    console.log(`\n  APPROVED COMBOS (pass both IS + OOS):`);
    for (const r of passingPairs) {
      console.log(`    ✅ ${r.instrument} ${r.timeframe} — WR ${r.combined.winRate}% | Sharpe ${r.combined.sharpe} | DD ${r.combined.maxDrawdown}%`);
    }
  }
  if (strongOOSPairs.length > 0) {
    console.log(`\n  PAPER TRADE FIRST (strong OOS, weak IS):`);
    for (const r of strongOOSPairs) {
      console.log(`    ⚠️  ${r.instrument} ${r.timeframe} — OOS WR ${r.outOfSample!.winRate}% | OOS Sharpe ${r.outOfSample!.sharpe}`);
    }
  }

  console.log("");
  writeFileSync(
    "backtest-live-results.json",
    JSON.stringify({ results, monthly, stress: { worstStreak, var95, profitableMonths, totalMonths: monthly.length }, combinedStats, oosStats }, null, 2),
  );
  console.log("  Results saved to: backtest-live-results.json\n");
  process.exit(0);
}

run().catch((err) => { console.error("Backtest failed:", err); process.exit(1); });
