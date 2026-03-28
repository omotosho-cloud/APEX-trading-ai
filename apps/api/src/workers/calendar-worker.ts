import { Worker } from "bullmq";
import { fetchAndStoreCalendar } from "../engine/calendar/calendar-fetcher.js";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

function parseRedisUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port) || 6379,
    ...(parsed.password ? { password: parsed.password } : {}),
    maxRetriesPerRequest: null as null,
  };
}

export const calendarWorker = new Worker(
  "calendar-sync",
  async () => {
    console.log("[CalendarWorker] Fetching ForexFactory calendar...");
    const count = await fetchAndStoreCalendar();
    console.log(`[CalendarWorker] Stored ${count} events`);
  },
  { connection: parseRedisUrl(redisUrl) },
);

calendarWorker.on("failed", (job, err) => {
  console.error(`[CalendarWorker] Job ${job?.id} failed:`, err.message);
});
