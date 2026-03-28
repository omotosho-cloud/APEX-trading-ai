import "dotenv/config";
import { runSignalPipeline } from "./signal/signal-pipeline.js";
import { calculateIndicators } from "./indicators/indicator-engine.js";
import { classifyRegime } from "./regime/regime-classifier.js";
import { generateNarrative } from "./signal/narrative-generator.js";
import { tsdb } from "../db/client.js";
import { candles } from "../db/schema/index.js";
import { and, eq, desc } from "drizzle-orm";

const TEST_PAIRS = [
  { instrument: "BTCUSDT", timeframe: "H4" },
  { instrument: "EURUSD",  timeframe: "H4" },
  { instrument: "GBPUSD",  timeframe: "M5" },
];

async function testIndicators(instrument: string, timeframe: string) {
  console.log(`\n── Indicators: ${instrument} ${timeframe} ──`);

  const rows = await tsdb
    .select()
    .from(candles)
    .where(and(eq(candles.instrument, instrument), eq(candles.timeframe, timeframe)))
    .orderBy(desc(candles.time))
    .limit(250);

  if (rows.length < 50) {
    console.log(`  ⚠ Only ${rows.length} candles — skipping`);
    return null;
  }

  const bars = rows.reverse().map((r) => ({
    open: parseFloat(r.open), high: parseFloat(r.high),
    low: parseFloat(r.low),   close: parseFloat(r.close),
    volume: parseFloat(r.volume),
  }));

  const ind = calculateIndicators(bars);
  console.log(`  Candles:    ${rows.length}`);
  console.log(`  Price:      ${bars[bars.length - 1]!.close}`);
  console.log(`  EMA20:      ${ind.ema20.toFixed(5)}`);
  console.log(`  RSI:        ${ind.rsi.toFixed(2)}`);
  console.log(`  ADX:        ${ind.adx.toFixed(2)}`);
  console.log(`  Hurst:      ${ind.hurst.toFixed(3)}`);
  console.log(`  ATR ratio:  ${ind.atrRatio.toFixed(3)}`);
  console.log(`  BB bwidth:  ${ind.bbBandwidth.toFixed(5)}`);
  console.log(`  Structure:  ${ind.structureScore}`);
  console.log(`  RVI:        ${ind.rvi.toFixed(2)}`);
  console.log(`  Eff. Ratio: ${ind.efficiencyRatio.toFixed(3)}`);

  const regime = classifyRegime(
    instrument, timeframe,
    ind.adx, ind.hurst, ind.atrRatio, ind.bbBandwidth,
    ind.structureScore, ind.efficiencyRatio,
  );
  console.log(`  Regime:     ${regime.regime} (conf ${regime.confidence}%) [${regime.session}]`);

  return { bars, ind, regime };
}

async function testNarrative() {
  console.log("\n── Groq Narrative Test ──");
  try {
    const narrative = await generateNarrative(
      "BTCUSDT", "H4", "buy", "trending_bull",
      {
        ema20: 65000, ema50: 63000, ema200: 55000,
        macdLine: 120, macdSignal: 80, macdHistogram: 40,
        rsi: 62, stochK: 68, stochD: 65,
        adx: 32, plusDI: 28, minusDI: 18,
        atr: 800, bbUpper: 67000, bbMiddle: 65000, bbLower: 63000,
        obv: 1000000, hurst: 0.63, atrRatio: 1.1,
        bbBandwidth: 0.031, structureScore: 8,
        rvi: 58, efficiencyRatio: 0.65,
      },
      "BTC showing strong momentum with ADX 32 and Hurst 0.63 confirming trend persistence.",
      "Risk of pullback if price fails to hold above EMA20 at 65000.",
    );
    console.log(`  ✅ Narrative generated (${narrative.length} chars):`);
    console.log(`  "${narrative}"`);
  } catch (err) {
    console.error(`  ❌ Narrative failed:`, err);
  }
}

async function testPipeline(instrument: string, timeframe: string) {
  console.log(`\n── Signal Pipeline: ${instrument} ${timeframe} ──`);
  const result = await runSignalPipeline(instrument, timeframe);
  if (result.fired) {
    console.log(`  ✅ Signal FIRED`);
  } else {
    console.log(`  ⏸  Suppressed: ${result.reason}`);
  }
}

async function main() {
  console.log("═══════════════════════════════════════");
  console.log("  APEX Phase 3 — Signal Engine Test");
  console.log("═══════════════════════════════════════");

  // Test 1: Indicators + regime on all test pairs
  for (const { instrument, timeframe } of TEST_PAIRS) {
    await testIndicators(instrument, timeframe);
  }

  // Test 2: Groq narrative
  await testNarrative();

  // Test 3: Full pipeline
  for (const { instrument, timeframe } of TEST_PAIRS) {
    await testPipeline(instrument, timeframe);
  }

  console.log("\n═══════════════════════════════════════");
  console.log("  Test complete");
  console.log("═══════════════════════════════════════\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
