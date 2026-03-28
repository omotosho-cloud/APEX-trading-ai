import { tsdb, db } from "../../db/client.js";
import { candles, regimeStates } from "../../db/schema/index.js";
import { sql, desc, and, eq } from "drizzle-orm";
import { calculateIndicators } from "../indicators/indicator-engine.js";
import { classifyRegime } from "./regime-classifier.js";
import { cacheSet, CacheKeys } from "../../redis.js";
import type { OHLCV } from "../indicators/indicator-engine.js";

const MIN_CANDLES = 210; // enough for EMA200

export async function runRegimeClassification(
  instrument: string,
  timeframe: string,
) {
  // Fetch last 250 candles for this instrument + timeframe
  const rows = await tsdb
    .select()
    .from(candles)
    .where(
      and(
        eq(candles.instrument, instrument),
        eq(candles.timeframe, timeframe),
      ),
    )
    .orderBy(desc(candles.time))
    .limit(250);

  if (rows.length < MIN_CANDLES) return null;

  // Reverse to chronological order
  const bars: OHLCV[] = rows.reverse().map((r) => ({
    open: parseFloat(r.open),
    high: parseFloat(r.high),
    low: parseFloat(r.low),
    close: parseFloat(r.close),
    volume: parseFloat(r.volume),
  }));

  const indicators = calculateIndicators(bars);

  const result = classifyRegime(
    instrument,
    timeframe,
    indicators.adx,
    indicators.hurst,
    indicators.atrRatio,
    indicators.bbBandwidth,
    indicators.structureScore,
    indicators.efficiencyRatio,
  );

  const now = new Date();

  // Write to regime_states
  await tsdb
    .insert(regimeStates)
    .values({
      time: now,
      instrument,
      timeframe,
      regime: result.regime,
      confidence: result.confidence,
      adx: indicators.adx.toFixed(2),
      hurst: indicators.hurst.toFixed(3),
      atr_ratio: indicators.atrRatio.toFixed(3),
      bb_bandwidth: indicators.bbBandwidth.toFixed(5),
      structure_score: indicators.structureScore,
    })
    .onConflictDoNothing();

  // Cache for 5 minutes
  await cacheSet(
    CacheKeys.regimeState(instrument, timeframe),
    { ...result, indicators, updatedAt: now.toISOString() },
    300,
  );

  return { ...result, indicators };
}

export async function runAllRegimeClassifications() {
  const { ALL_INSTRUMENTS, ALL_TIMEFRAMES } = await import(
    "../market-data/instruments.js"
  );

  const results = await Promise.allSettled(
    ALL_INSTRUMENTS.flatMap((instrument) =>
      ALL_TIMEFRAMES.map((timeframe) =>
        runRegimeClassification(instrument, timeframe),
      ),
    ),
  );

  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0) {
    console.error(`[Regime] ${failed.length} classifications failed`);
  }

  return results;
}
