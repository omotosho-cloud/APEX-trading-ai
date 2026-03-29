import { Worker } from "bullmq";
import { runSignalPipeline } from "../engine/signal/signal-pipeline.js";
import { ALL_INSTRUMENTS, ALL_TIMEFRAMES } from "../engine/market-data/instruments.js";
import { parseRedisUrl, REDIS_URL } from "../redis-connection.js";

export const signalWorker = new Worker(
  "signal-generation",
  async () => {
    console.log("[SignalWorker] Running signal pipeline for all instruments...");
    let fired = 0, suppressed = 0;

    await Promise.allSettled(
      ALL_INSTRUMENTS.flatMap((instrument) =>
        ALL_TIMEFRAMES.map(async (timeframe) => {
          const result = await runSignalPipeline(instrument, timeframe);
          if (result.fired) fired++;
          else suppressed++;
        }),
      ),
    );

    console.log(`[SignalWorker] Done — fired: ${fired}, suppressed: ${suppressed}`);
  },
  { connection: parseRedisUrl(REDIS_URL), concurrency: 1 },
);

signalWorker.on("failed", (job, err) => {
  console.error(`[SignalWorker] Job ${job?.id} failed:`, err.message);
});
