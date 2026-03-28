import "dotenv/config";
import { tsdb } from "../db/client.js";
import { candles } from "../db/schema/index.js";
import { and, eq, asc } from "drizzle-orm";
import { calculateIndicators } from "./indicators/indicator-engine.js";
import { classifyRegime } from "./regime/regime-classifier.js";
import { ALL_INSTRUMENTS, ALL_TIMEFRAMES } from "./market-data/instruments.js";
import type { OHLCV } from "./indicators/indicator-engine.js";

type BacktestResult = {
  instrument: string;
  timeframe: string;
  totalSignals: number;
  wins: number;
  losses: number;
  winRate: number;
  expectancy: number;
  sharpe: number;
  maxDrawdown: number;
};

const ATR_MULT_SL = 1.5;
const ATR_MULT_TP = 3.0;
const MIN_CONFIDENCE = 60;
const LOOKBACK = 250;
const STEP = 5; // evaluate every N candles

async function backtestInstrument(
  instrument: string,
  timeframe: string,
): Promise<BacktestResult | null> {
  const rows = await tsdb
    .select()
    .from(candles)
    .where(and(eq(candles.instrument, instrument), eq(candles.timeframe, timeframe)))
    .orderBy(asc(candles.time))
    .limit(5000);

  if (rows.length < LOOKBACK + 50) return null;

  const bars: OHLCV[] = rows.map((r) => ({
    open: parseFloat(r.open),
    high: parseFloat(r.high),
    low: parseFloat(r.low),
    close: parseFloat(r.close),
    volume: parseFloat(r.volume),
  }));

  const returns: number[] = [];
  let equity = 1.0;
  let peak = 1.0;
  let maxDrawdown = 0;
  let wins = 0, losses = 0;

  for (let i = LOOKBACK; i < bars.length - 20; i += STEP) {
    const window = bars.slice(i - LOOKBACK, i);
    const indicators = calculateIndicators(window);
    const { regime, confidence } = classifyRegime(
      instrument, timeframe,
      indicators.adx, indicators.hurst, indicators.atrRatio,
      indicators.bbBandwidth, indicators.structureScore, indicators.efficiencyRatio,
    );

    if (regime === "choppy" || regime === "volatile") continue;
    if (confidence < MIN_CONFIDENCE) continue;

    // Determine signal direction from regime + indicators
    const isBull =
      (regime === "trending_bull" && indicators.ema20 > indicators.ema50) ||
      (regime === "ranging" && indicators.rsi < 35) ||
      (regime === "breakout_imminent" && indicators.macdHistogram > 0);

    const isBear =
      (regime === "trending_bear" && indicators.ema20 < indicators.ema50) ||
      (regime === "ranging" && indicators.rsi > 65) ||
      (regime === "breakout_imminent" && indicators.macdHistogram < 0);

    if (!isBull && !isBear) continue;

    const entry = bars[i]!.close;
    const atr = indicators.atr;
    const sl = isBull ? entry - atr * ATR_MULT_SL : entry + atr * ATR_MULT_SL;
    const tp = isBull ? entry + atr * ATR_MULT_TP : entry - atr * ATR_MULT_TP;
    const slDist = Math.abs(entry - sl);
    const tpDist = Math.abs(entry - tp);

    // Simulate outcome over next 20 candles
    let outcome: "win" | "loss" | null = null;
    for (let j = i + 1; j <= i + 20 && j < bars.length; j++) {
      const bar = bars[j]!;
      if (isBull) {
        if (bar.low <= sl) { outcome = "loss"; break; }
        if (bar.high >= tp) { outcome = "win"; break; }
      } else {
        if (bar.high >= sl) { outcome = "loss"; break; }
        if (bar.low <= tp) { outcome = "win"; break; }
      }
    }

    if (!outcome) continue;

    const rr = tpDist / slDist;
    const ret = outcome === "win" ? rr * 0.01 : -0.01; // 1% risk per trade
    returns.push(ret);
    equity *= 1 + ret;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, (peak - equity) / peak);
    if (outcome === "win") wins++; else losses++;
  }

  const total = wins + losses;
  if (total === 0) return null;

  const winRate = wins / total;
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const retStd = Math.sqrt(
    returns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / returns.length,
  );
  const sharpe = retStd > 0 ? (avgReturn / retStd) * Math.sqrt(252) : 0;
  const expectancy = winRate * (ATR_MULT_TP * 0.01) - (1 - winRate) * 0.01;

  return {
    instrument, timeframe,
    totalSignals: total, wins, losses,
    winRate: Math.round(winRate * 100) / 100,
    expectancy: Math.round(expectancy * 10000) / 10000,
    sharpe: Math.round(sharpe * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 10000) / 100,
  };
}

async function runBacktest() {
  console.log("\nAPEX Backtesting Runner\n");
  const results: BacktestResult[] = [];

  for (const instrument of ALL_INSTRUMENTS) {
    for (const timeframe of ALL_TIMEFRAMES) {
      process.stdout.write(`  ${instrument} ${timeframe} ... `);
      try {
        const result = await backtestInstrument(instrument, timeframe);
        if (result) {
          results.push(result);
          console.log(
            `WR: ${(result.winRate * 100).toFixed(0)}% | Sharpe: ${result.sharpe} | DD: ${result.maxDrawdown}% | n=${result.totalSignals}`,
          );
        } else {
          console.log("insufficient data");
        }
      } catch (err) {
        console.error(`FAILED — ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  // Summary
  console.log("\n─── Summary ───────────────────────────────────────────");
  const passing = results.filter((r) => r.winRate >= 0.5 && r.sharpe > 0);
  console.log(`Passing (WR≥50% & Sharpe>0): ${passing.length}/${results.length}`);
  console.log(
    `Avg win rate: ${(results.reduce((s, r) => s + r.winRate, 0) / results.length * 100).toFixed(1)}%`,
  );
  console.log(
    `Avg Sharpe: ${(results.reduce((s, r) => s + r.sharpe, 0) / results.length).toFixed(2)}`,
  );

  process.exit(0);
}

runBacktest().catch((err) => {
  console.error("Backtest failed:", err);
  process.exit(1);
});
