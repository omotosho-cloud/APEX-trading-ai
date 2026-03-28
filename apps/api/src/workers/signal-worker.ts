import { Worker } from "bullmq";
import { runSignalPipeline } from "../engine/signal/signal-pipeline.js";
import { ALL_INSTRUMENTS, ALL_TIMEFRAMES } from "../engine/market-data/instruments.js";

function parseRedisUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port) || 6379,
    ...(parsed.password ? { password: parsed.password } : {}),
    maxRetriesPerRequest: null as null,
  };
}

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

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
  { connection: parseRedisUrl(redisUrl), concurrency: 1 },
);

signalWorker.on("failed", (job, err) => {
  console.error(`[SignalWorker] Job ${job?.id} failed:`, err.message);
});
