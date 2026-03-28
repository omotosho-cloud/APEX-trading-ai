import { Worker } from "bullmq";
import { fetchAndStoreCalendar } from "../engine/calendar/calendar-fetcher.js";
import { parseRedisUrl, REDIS_URL } from "../redis-connection.js";

export const calendarWorker = new Worker(
  "calendar-sync",
  async () => {
    console.log("[CalendarWorker] Fetching ForexFactory calendar...");
    const count = await fetchAndStoreCalendar();
    console.log(`[CalendarWorker] Stored ${count} events`);
  },
  { connection: parseRedisUrl(REDIS_URL) },
);

calendarWorker.on("failed", (job, err) => {
  console.error(`[CalendarWorker] Job ${job?.id} failed:`, err.message);
});
