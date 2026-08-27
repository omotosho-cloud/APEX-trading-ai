import { CandleAggregator } from "./candle-aggregator.js";
import { startTwelveDataFeed } from "./twelve-data-feed.js";
// Deriv feed disabled — only trading forex pairs now
// import { startDerivFeed } from "./deriv-feed.js";
// Binance feed disabled — crypto not active
// import { startBinanceFeed } from "./binance-feed.js";
import { writeCandle } from "./candle-writer.js";
import type { OHLCVCandle } from "./candle-aggregator.js";

type CandleHandler = (candle: OHLCVCandle) => Promise<void>;

export function startRealTimeFeed(onCandleClose?: CandleHandler) {
  const aggregator = new CandleAggregator();

  aggregator.on("candle", async (candle: OHLCVCandle) => {
    await writeCandle(candle);
    if (onCandleClose) {
      await onCandleClose(candle).catch((err) =>
        console.error("[Feed] onCandleClose error:", err),
      );
    }
  });

  // ── Forex (primary — all major and minor pairs via TwelveData) ────────────
  const stopTwelveData = startTwelveDataFeed(aggregator);

  console.log("[Feed] Real-time feed started — TwelveData (forex major + minor pairs)");

  return () => {
    stopTwelveData();
  };
}
