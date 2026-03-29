#!/usr/bin/env node
/**
 * Quick Backtest Parameter Tester
 * Runs backtest with different parameter sets to find optimal configuration
 */

import "dotenv/config";
import { tsdb } from "../db/client.js";
import { candles } from "../db/schema/index.js";
import { and, eq, asc } from "drizzle-orm";
import { calculateIndicators } from "./indicators/indicator-engine.js";
import { classifyRegime } from "./regime/regime-classifier.js";
import { ALL_INSTRUMENTS, ALL_TIMEFRAMES } from "./market-data/instruments.js";
import type { OHLCV } from "./indicators/indicator-engine.js";

// Test multiple parameter configurations
const PARAM_SETS = [
  {
    name: "Conservative",
    ATR_MULT_SL: 2.0,
    ATR_MULT_TP: 4.0,
    MIN_CONFIDENCE: 70,
    RISK_PER_TRADE: 0.005,
  },
  {
    name: "Aggressive",
    ATR_MULT_SL: 1.0,
    ATR_MULT_TP: 5.0,
    MIN_CONFIDENCE: 50,
    RISK_PER_TRADE: 0.02,
  },
  {
    name: "Balanced (Default)",
    ATR_MULT_SL: 1.5,
    ATR_MULT_TP: 3.0,
    MIN_CONFIDENCE: 60,
    RISK_PER_TRADE: 0.01,
  },
  {
    name: "Wide Stops",
    ATR_MULT_SL: 2.5,
    ATR_MULT_TP: 5.0,
    MIN_CONFIDENCE: 60,
    RISK_PER_TRADE: 0.01,
  },
  {
    name: "Tight Stops",
    ATR_MULT_SL: 1.0,
    ATR_MULT_TP: 2.5,
    MIN_CONFIDENCE: 65,
    RISK_PER_TRADE: 0.01,
  },
];

const LOOKBACK = 250;
const STEP = 5; // Faster testing

async function testParamSet(
  instrument: string,
  timeframe: string,
  params: (typeof PARAM_SETS)[0],
) {
  const rows = await tsdb
    .select()
    .from(candles)
    .where(
      and(eq(candles.instrument, instrument), eq(candles.timeframe, timeframe)),
    )
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

  let equity = 1.0;
  let wins = 0,
    losses = 0;
  let maxDD = 0;
  let peak = 1.0;

  for (let i = LOOKBACK; i < bars.length - 20; i += STEP) {
    const window = bars.slice(i - LOOKBACK, i);
    const indicators = calculateIndicators(window);
    const { regime, confidence } = classifyRegime(
      instrument,
      timeframe,
      indicators.adx,
      indicators.hurst,
      indicators.atrRatio,
      indicators.bbBandwidth,
      indicators.structureScore,
      indicators.efficiencyRatio,
    );

    if (regime === "choppy" || regime === "volatile") continue;
    if (confidence < params.MIN_CONFIDENCE) continue;

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
    const direction = isBull ? "buy" : "sell";

    const sl =
      direction === "buy"
        ? entry - atr * params.ATR_MULT_SL
        : entry + atr * params.ATR_MULT_SL;

    const tp =
      direction === "buy"
        ? entry + atr * params.ATR_MULT_TP
        : entry - atr * params.ATR_MULT_TP;

    let outcome: "win" | "loss" | null = null;
    for (let j = i + 1; j <= i + 20 && j < bars.length; j++) {
      const bar = bars[j]!;
      if (direction === "buy") {
        if (bar.low <= sl) {
          outcome = "loss";
          break;
        }
        if (bar.high >= tp) {
          outcome = "win";
          break;
        }
      } else {
        if (bar.high >= sl) {
          outcome = "loss";
          break;
        }
        if (bar.low <= tp) {
          outcome = "win";
          break;
        }
      }
    }

    if (!outcome) continue;

    const ret =
      outcome === "win"
        ? (params.ATR_MULT_TP / params.ATR_MULT_SL) * params.RISK_PER_TRADE
        : -params.RISK_PER_TRADE;

    equity *= 1 + ret;
    peak = Math.max(peak, equity);
    const dd = (peak - equity) / peak;
    maxDD = Math.max(maxDD, dd);

    if (outcome === "win") wins++;
    else losses++;

    if (dd > 0.25) break; // Stop at 25% DD
  }

  const total = wins + losses;
  if (total === 0) return null;

  const winRate = wins / total;
  const totalReturn = (equity - 1.0) * 100;

  return {
    wins,
    losses,
    winRate,
    totalReturn,
    maxDD,
    trades: total,
  };
}

async function runParameterTest() {
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("   APEX Parameter Optimization Test");
  console.log("═══════════════════════════════════════════════════════\n");

  // Test on a few representative pairs
  const TEST_PAIRS = [
    { instrument: "EURUSD", timeframe: "H4" },
    { instrument: "GBPUSD", timeframe: "H4" },
    { instrument: "BTCUSDT", timeframe: "H4" },
    { instrument: "USDJPY", timeframe: "H4" },
  ];

  const results: Array<{
    paramSet: string;
    instrument: string;
    winRate: number;
    totalReturn: number;
    maxDD: number;
    trades: number;
  }> = [];

  for (const params of PARAM_SETS) {
    console.log(`\n📊 Testing: ${params.name}`);
    console.log(
      `   SL: ${params.ATR_MULT_SL}×ATR | TP: ${params.ATR_MULT_TP}×ATR | Confidence: ${params.MIN_CONFIDENCE}% | Risk: ${(params.RISK_PER_TRADE * 100).toFixed(1)}%`,
    );
    console.log("-".repeat(60));

    for (const { instrument, timeframe } of TEST_PAIRS) {
      process.stdout.write(`  ${instrument} ${timeframe} ... `);

      try {
        const result = await testParamSet(instrument, timeframe, params);

        if (result) {
          const status =
            result.winRate >= 0.5 && result.maxDD < 0.2 ? "✅" : "❌";
          console.log(
            `${status} WR: ${(result.winRate * 100).toFixed(1)}% | Return: ${result.totalReturn.toFixed(2)}% | DD: ${(result.maxDD * 100).toFixed(2)}% | n=${result.trades}`,
          );

          results.push({
            paramSet: params.name,
            instrument,
            winRate: result.winRate,
            totalReturn: result.totalReturn,
            maxDD: result.maxDD,
            trades: result.trades,
          });
        } else {
          console.log("⚠️  insufficient data");
        }
      } catch (err) {
        console.error(`FAILED — ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  // Summary
  console.log("\n\n═══════════════════════════════════════════════════════");
  console.log("   PARAMETER COMPARISON");
  console.log("═══════════════════════════════════════════════════════");

  for (const params of PARAM_SETS) {
    const paramResults = results.filter((r) => r.paramSet === params.name);
    if (paramResults.length === 0) continue;

    const avgWR =
      paramResults.reduce((s, r) => s + r.winRate, 0) / paramResults.length;
    const avgReturn =
      paramResults.reduce((s, r) => s + r.totalReturn, 0) / paramResults.length;
    const avgDD =
      paramResults.reduce((s, r) => s + r.maxDD, 0) / paramResults.length;
    const totalTrades = paramResults.reduce((s, r) => s + r.trades, 0);

    const passing = paramResults.filter(
      (r) => r.winRate >= 0.5 && r.maxDD < 0.2,
    ).length;
    const passRate = (passing / paramResults.length) * 100;

    console.log(`\n${params.name}:`);
    console.log(`  Avg Win Rate: ${(avgWR * 100).toFixed(1)}%`);
    console.log(`  Avg Return: ${avgReturn.toFixed(2)}%`);
    console.log(`  Avg DD: ${(avgDD * 100).toFixed(2)}%`);
    console.log(
      `  Pass Rate: ${passRate.toFixed(0)}% (${passing}/${paramResults.length})`,
    );
    console.log(`  Total Trades: ${totalTrades}`);
  }

  console.log("\n\n💡 RECOMMENDATION:");
  console.log("   Choose the parameter set with:");
  console.log("   1. Highest pass rate");
  console.log("   2. Acceptable drawdown (<20%)");
  console.log("   3. Reasonable trade frequency");
  console.log("   4. Consistent performance across instruments\n");

  process.exit(0);
}

runParameterTest().catch((err) => {
  console.error("Parameter test failed:", err);
  process.exit(1);
});
