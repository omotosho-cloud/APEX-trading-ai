import { tsdb } from "../../db/client.js";
import { candles } from "../../db/schema/index.js";
import { cacheSet, CacheKeys } from "../../redis.js";
import type { OHLCVCandle } from "./candle-aggregator.js";

export async function writeCandle(candle: OHLCVCandle) {
  try {
    await tsdb
      .insert(candles)
      .values({
        time: candle.time,
        instrument: candle.instrument,
        timeframe: candle.timeframe,
        open: candle.open.toString(),
        high: candle.high.toString(),
        low: candle.low.toString(),
        close: candle.close.toString(),
        volume: candle.volume.toString(),
      })
      .onConflictDoNothing();

    // Cache latest candle per instrument:timeframe (TTL 10 min)
    await cacheSet(
      `candle:latest:${candle.instrument}:${candle.timeframe}`,
      candle,
      600,
    );
  } catch (err) {
    console.error(
      `[CandleWriter] Failed to write ${candle.instrument} ${candle.timeframe}:`,
      err,
    );
  }
}
