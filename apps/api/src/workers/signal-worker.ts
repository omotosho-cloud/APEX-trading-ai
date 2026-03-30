import { Worker } from "bullmq";
import { runSignalPipeline } from "../engine/signal/signal-pipeline.js";
import { parseRedisUrl, REDIS_URL } from "../redis-connection.js";

// Live trading pairs approved by backtest (H4 only)
const LIVE_INSTRUMENTS = [
  "EURUSD", 
  "USDJPY", 
  "USDCHF",  
  "NZDUSD",  
  "GBPUSD",  
] as const;

const LIVE_TIMEFRAME = "H4";

export const signalWorker = new Worker(
  "signal-generation",
  async () => {
    console.log(`[SignalWorker] Running H4 pipeline for ${LIVE_INSTRUMENTS.length} pairs...`);
    let fired = 0, suppressed = 0;

    await Promise.allSettled(
      LIVE_INSTRUMENTS.map(async (instrument) => {
        const result = await runSignalPipeline(instrument, LIVE_TIMEFRAME);
        if (result.fired) fired++;
        else suppressed++;
        console.log(`[SignalWorker] ${instrument} H4 — ${result.fired ? "FIRED" : result.reason}`);
      }),
    );

    console.log(`[SignalWorker] Done — fired: ${fired}, suppressed: ${suppressed}`);
  },
  { connection: parseRedisUrl(REDIS_URL), concurrency: 1 },
);

signalWorker.on("failed", (job, err) => {
  console.error(`[SignalWorker] Job ${job?.id} failed:`, err.message);
});
