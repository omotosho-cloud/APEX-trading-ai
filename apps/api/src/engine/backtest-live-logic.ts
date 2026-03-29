import "dotenv/config";
import { tsdb } from "../db/client.js";
import { candles } from "../db/schema/index.js";
import { and, eq, asc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { calculateIndicators } from "./indicators/indicator-engine.js";
import { classifyRaw } from "./regime/regime-classifier.js";
import { calculateSignalLevels } from "./signal/tp-sl-engine.js";
import { technicalExpert } from "./experts/technical-expert.js";
import { smartMoneyExpert } from "./experts/smart-money-expert.js";
import { macroExpert } from "./experts/macro-expert.js";
import { sanityCheckExpert, applySanityCap } from "./experts/sanity-check.js";
import { BASE_WEIGHTS, getRegimeWeights } from "./backtest-helpers.js";
import { ALL_INSTRUMENTS } from "./market-data/instruments.js";
import { writeFileSync } from "fs";
import type { OHLCV } from "./indicators/indicator-engine.js";
import type { Regime } from "@apex/types";

const MIN_CONFIDENCE = 60;
const LOOKBACK       = 250;
const FORWARD_BARS   = 120; // 120 H4 bars = 20 days — enough time for TP2/TP3 to be reached
const RISK_PER_TRADE = 0.01;
const TIMEFRAME      = "H4";
const COOLDOWN       = 5;

const LIVE_PAIRS = [
  "EURUSD","GBPUSD","USDJPY","USDCHF",
  "NZDUSD","EURGBP","EURJPY","GBPJPY",
];

const WALKFORWARD_SPLIT = "2025-01-01";

type Trade = {
  instrument: string;
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

function getWeights(instrument: string, regime: Regime) {
  const w = { ...BASE_WEIGHTS };
  const adj = getRegimeWeights(regime, TIMEFRAME, instrument);
  for (const k of Object.keys(w) as (keyof typeof w)[]) w[k] = Math.max(0, w[k]! + (adj[k] ?? 0));
  const total = Object.values(w).reduce((s, v) => s + v, 0);
  for (const k of Object.keys(w) as (keyof typeof w)[]) w[k]! /= total;
  return w;
}

function riskManager(rrRatio: number, atrRatio: number, confidence: number) {
  if (rrRatio < 0.9) return { approved: false, confidence };
  if (confidence < MIN_CONFIDENCE) return { approved: false, confidence };
  let adj = confidence;
  if (atrRatio > 1.8) adj -= 5;
  return { approved: adj >= MIN_CONFIDENCE, confidence: Math.round(adj) };
}

async function simulatePair(instrument: string): Promise<Trade[]> {
  const rows = await tsdb
    .select()
    .from(candles)
    .where(and(eq(candles.instrument, instrument), eq(candles.timeframe, TIMEFRAME)))
    .orderBy(asc(candles.time))
    .limit(50_000);

  if (rows.length < LOOKBACK + FORWARD_BARS + 10) return [];

  const bars: (OHLCV & { time: Date })[] = rows.map((r) => ({
    open: parseFloat(r.open), high: parseFloat(r.high),
    low:  parseFloat(r.low),  close: parseFloat(r.close),
    volume: parseFloat(r.volume), time: new Date(r.time),
  }));

  const splitDate = new Date(WALKFORWARD_SPLIT);
  const trades: Trade[] = [];
  let lastSignalBar = -999;

  for (let i = LOOKBACK; i < bars.length - FORWARD_BARS; i++) {
    if (i - lastSignalBar < COOLDOWN) continue;

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
    if (regimeConf < MIN_CONFIDENCE) continue;

    const price = bars[i]!.close;
    const weights = getWeights(instrument, regime);

    const votes = {
      technical:   technicalExpert(ind, regime, price),
      smart_money: smartMoneyExpert(window, ind, price, TIMEFRAME),
      sentiment:   sentimentStub(instrument, ind),
      macro:       macroExpert(instrument, TIMEFRAME, ind, regime),
      quant:       quantStub(),
    };

    const threshold = regime === "breakout_imminent" ? 40 : regime === "volatile" ? 55 : 60;
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

    const levels = calculateSignalLevels(instrument, TIMEFRAME, direction, price, ind.atr, regime);
    if (!levels.passes) continue;

    const risk = riskManager(levels.rrRatio, ind.atrRatio, conf);
    if (!risk.approved) continue;

    lastSignalBar = i;

    let outcome: "tp1" | "tp2" | "tp3" | "sl" | "expired" = "expired";
    let barsToClose = FORWARD_BARS;
    for (let j = i + 1; j <= i + FORWARD_BARS && j < bars.length; j++) {
      const bar = bars[j]!;
      if (direction === "buy") {
        if (bar.low  <= levels.slPrice)   { outcome = "sl";  barsToClose = j - i; break; }
        if (levels.tp3Price && bar.high >= levels.tp3Price) { outcome = "tp3"; barsToClose = j - i; break; }
        if (bar.high >= levels.tp2Price)  { outcome = "tp2"; barsToClose = j - i; break; }
        if (bar.high >= levels.tp1Price)  { outcome = "tp1"; barsToClose = j - i; break; }
      } else {
        if (bar.high >= levels.slPrice)   { outcome = "sl";  barsToClose = j - i; break; }
        if (levels.tp3Price && bar.low <= levels.tp3Price)  { outcome = "tp3"; barsToClose = j - i; break; }
        if (bar.low  <= levels.tp2Price)  { outcome = "tp2"; barsToClose = j - i; break; }
        if (bar.low  <= levels.tp1Price)  { outcome = "tp1"; barsToClose = j - i; break; }
      }
    }

    // Realistic partial close model matching live exit protocol:
    // TP1 hit: close 50% at TP1 R:R, remaining 50% trails to TP2
    // TP2 hit: close 30% more at TP2 R:R, remaining 20% trails to TP3
    // TP3 hit: close final 20% at TP3 R:R
    // SL hit:  full loss
    const rr1 = levels.rrRatio;          // TP1 R:R
    const rr2 = levels.rrRatio * 2;      // TP2 R:R
    const rr3 = levels.tp3Price          // TP3 R:R
      ? Math.abs(levels.tp3Price - levels.entryPrice) / Math.abs(levels.slPrice - levels.entryPrice)
      : rr2 * 1.5;

    const pnlR =
      outcome === "tp3" ? (0.5 * rr1 + 0.3 * rr2 + 0.2 * rr3) * RISK_PER_TRADE * 100 :
      outcome === "tp2" ? (0.5 * rr1 + 0.5 * rr2)              * RISK_PER_TRADE * 100 :
      outcome === "tp1" ? (0.5 * rr1 + 0.5 * rr1)              * RISK_PER_TRADE * 100 :
      outcome === "sl"  ? -1 : -0.2;

    trades.push({
      instrument, direction, regime,
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
  console.log("║     APEX H4 BACKTEST — WALK-FORWARD VALIDATION          ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`\nTimeframe: H4  |  In-sample: 2020-2024  |  Out-of-sample: 2025+`);
  console.log(`Pairs: ${LIVE_PAIRS.join(", ")}\n`);

  const allTrades: Trade[] = [];
  const results: PairResult[] = [];

  const dataInfo = await tsdb
    .select({
      instrument: candles.instrument,
      years: sql<string>`ROUND(EXTRACT(EPOCH FROM (MAX(time) - MIN(time))) / 86400 / 365, 1)`,
    })
    .from(candles)
    .where(eq(candles.timeframe, TIMEFRAME))
    .groupBy(candles.instrument);

  const yearsMap: Record<string, number> = {};
  for (const r of dataInfo) yearsMap[r.instrument] = parseFloat(r.years ?? "0");

  for (const instrument of ALL_INSTRUMENTS) {
    if (!LIVE_PAIRS.includes(instrument)) continue;

    const dataYears = yearsMap[instrument] ?? 0;
    process.stdout.write(`  ${instrument.padEnd(10)} [${dataYears}y] ... `);

    try {
      const trades = await simulatePair(instrument);
      const isTrades  = trades.filter((t) => t.period === "in-sample");
      const oosTrades = trades.filter((t) => t.period === "out-of-sample");

      const inSample    = calcPeriodStats(isTrades);
      const outOfSample = calcPeriodStats(oosTrades);
      const combined    = calcPeriodStats(trades);

      if (!inSample || !combined) { console.log(`insufficient data (${trades.length} trades)`); continue; }

      allTrades.push(...trades);

      const passes   = meetsCriteria(inSample) && (outOfSample ? meetsCriteria(outOfSample) : false);
      const strongOOS = !passes && outOfSample !== null && outOfSample.winRate >= 50 && outOfSample.sharpe >= 1.0;

      results.push({ instrument, dataYears, inSample, outOfSample, combined, passes, strongOOS });

      const v = passes ? "✅" : strongOOS ? "⚠️ " : "❌";
      const oos = outOfSample ? `OOS: WR=${outOfSample.winRate}% Sharpe=${outOfSample.sharpe}` : "OOS: n/a";
      console.log(`${v} IS: WR=${inSample.winRate}% Sharpe=${inSample.sharpe} DD=${inSample.maxDrawdown}%  |  ${oos}`);
    } catch (err) {
      console.error(`FAILED — ${err instanceof Error ? err.message : err}`);
    }
  }

  if (allTrades.length === 0) { console.log("\n⚠️  No trades generated."); process.exit(0); }

  const byRegime: Record<string, Trade[]> = {};
  for (const t of allTrades) (byRegime[t.regime] ??= []).push(t);

  const buys  = allTrades.filter((t) => t.direction === "buy");
  const sells = allTrades.filter((t) => t.direction === "sell");
  const buyWR  = buys.filter((t)  => t.outcome === "tp1" || t.outcome === "tp2").length / (buys.length  || 1) * 100;
  const sellWR = sells.filter((t) => t.outcome === "tp1" || t.outcome === "tp2").length / (sells.length || 1) * 100;

  const byMonth: Record<string, Trade[]> = {};
  for (const t of allTrades) (byMonth[t.month] ??= []).push(t);
  const monthly = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, ts]) => {
      const wins   = ts.filter((t) => t.outcome === "tp1" || t.outcome === "tp2").length;
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

  console.log("\n" + "=".repeat(70));
  console.log("  PAIR RESULTS — IN-SAMPLE vs OUT-OF-SAMPLE");
  console.log("=".repeat(70));
  console.log(`  ${"Pair".padEnd(10)} ${"IS WR".padStart(7)} ${"IS Sharpe".padStart(10)} ${"IS DD".padStart(7)} ${"OOS WR".padStart(8)} ${"OOS Sharpe".padStart(11)} ${"OOS DD".padStart(8)}`);
  console.log("  " + "-".repeat(68));
  for (const r of results) {
    const v = r.passes ? "✅" : r.strongOOS ? "⚠️ " : "❌";
    const oos = r.outOfSample;
    console.log(
      `  ${v} ${r.instrument.padEnd(9)} ` +
      `${String(r.inSample.winRate).padStart(6)}% ` +
      `${String(r.inSample.sharpe).padStart(9)}  ` +
      `${String(r.inSample.maxDrawdown).padStart(6)}%  ` +
      `${oos ? String(oos.winRate).padStart(7)+"%" : "    n/a"}  ` +
      `${oos ? String(oos.sharpe).padStart(10) : "       n/a"}  ` +
      `${oos ? String(oos.maxDrawdown).padStart(7)+"%" : "    n/a"}`,
    );
  }

  console.log("\n" + "=".repeat(70));
  console.log("  REGIME BREAKDOWN");
  console.log("=".repeat(70));
  for (const [regime, ts] of Object.entries(byRegime).sort((a, b) => b[1].length - a[1].length)) {
    const wins = ts.filter((t) => t.outcome === "tp1" || t.outcome === "tp2").length;
    const wr   = Math.round(wins / ts.length * 1000) / 10;
    const avgR = Math.round(ts.reduce((s, t) => s + t.pnlR, 0) / ts.length * 100) / 100;
    console.log(`  ${regime.padEnd(22)} n=${String(ts.length).padStart(5)} | WR=${String(wr).padStart(5)}% | avgR=${String(avgR).padStart(5)} | ${"#".repeat(Math.round(wr / 5))}`);
  }

  console.log("\n" + "=".repeat(70));
  console.log("  DIRECTION ANALYSIS");
  console.log("=".repeat(70));
  console.log(`  BUY  signals: ${buys.length.toString().padStart(5)} | Win rate: ${buyWR.toFixed(1)}%`);
  console.log(`  SELL signals: ${sells.length.toString().padStart(5)} | Win rate: ${sellWR.toFixed(1)}%`);

  console.log("\n" + "=".repeat(70));
  console.log("  MONTHLY RESULTS");
  console.log("=".repeat(70));
  for (const m of monthly) {
    const sign = m.totalR >= 0 ? "+" : "";
    const flag = m.totalR >= 0 ? "  " : "XX";
    console.log(`  ${flag} ${m.month}  ${String(m.trades).padStart(5)}  ${String(m.winRate).padStart(5)}%  ${sign}${String(m.totalR).padStart(8)}R`);
  }

  console.log("\n" + "=".repeat(70));
  console.log("  STRESS TEST");
  console.log("=".repeat(70));
  console.log(`  Worst consecutive losses:  ${worstStreak}  ${worstStreak <= 12 ? "OK" : "FAIL"} (need <=12)`);
  console.log(`  VaR 95% per trade:         ${(var95 * 100).toFixed(2)}%`);
  console.log(`  Profitable months:         ${profitableMonths}/${monthly.length} (${(profitableMonths/monthly.length*100).toFixed(0)}%)  ${profitableMonths/monthly.length >= 0.55 ? "OK" : "FAIL"} (need >=55%)`);

  const passingPairs  = results.filter((r) => r.passes);
  const strongOOSPairs = results.filter((r) => r.strongOOS);
  const combinedStats = calcPeriodStats(allTrades)!;
  const oosStats      = calcPeriodStats(allTrades.filter((t) => t.period === "out-of-sample"));

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
  console.log(`  Pairs passing IS+OOS:    ${passingPairs.length}/8   ${passingPairs.length >= 2 ? "OK" : "FAIL"} (need >=2)`);
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

  if (ready) {
    console.log(`\n  APPROVED FOR LIVE TRADING (pass both IS + OOS):`);
    for (const r of passingPairs) {
      console.log(`    OK ${r.instrument} H4 — WR ${r.combined.winRate}% | Sharpe ${r.combined.sharpe} | DD ${r.combined.maxDrawdown}%`);
    }
    if (strongOOSPairs.length > 0) {
      console.log(`\n  PAPER TRADE FIRST (strong OOS but weak IS — monitor 30 days):`);
      for (const r of strongOOSPairs) {
        console.log(`    WATCH ${r.instrument} H4 — OOS WR ${r.outOfSample!.winRate}% | OOS Sharpe ${r.outOfSample!.sharpe}`);
      }
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
