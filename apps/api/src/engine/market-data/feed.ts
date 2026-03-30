import { CandleAggregator } from "./candle-aggregator.js";
import { startBinanceFeed } from "./binance-feed.js";
import { startTwelveDataFeed } from "./twelve-data-feed.js";
import { writeCandle } from "./candle-writer.js";
import type { OHLCVCandle } from "./candle-aggregator.js";

type CandleHandler = (candle: OHLCVCandle) => Promise<void>;

export function startRealTimeFeed(onCandleClose?: CandleHandler) {
  const aggregator = new CandleAggregator();

  aggregator.on("candle", async (candle: OHLCVCandle) => {
    // 1. Persist to DB
    await writeCandle(candle);

    // 2. Trigger downstream handler (signal pipeline) if provided
    if (onCandleClose) {
      await onCandleClose(candle).catch((err) =>
        console.error("[Feed] onCandleClose error:", err),
      );
    }
  });

  const stopTwelveData = startTwelveDataFeed(aggregator);
  // Binance disabled — only trading forex pairs
  // const stopBinance = startBinanceFeed(aggregator);

  console.log("[Feed] Real-time feed started — TwelveData (forex)");

  return () => {
    stopTwelveData();
  };
}
