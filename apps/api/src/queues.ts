import { Queue } from "bullmq";
import { parseRedisUrl, REDIS_URL } from "./redis-connection.js";

const connection = parseRedisUrl(REDIS_URL);
const queueOpts = { connection };

export const signalGenerationQueue = new Queue("signal-generation", queueOpts);
export const calendarSyncQueue = new Queue("calendar-sync", queueOpts);
export const outcomeTrackerQueue = new Queue("outcome-tracker", queueOpts);
export const expertAdaptationQueue = new Queue("expert-adaptation", queueOpts);
export const telegramAlertsQueue = new Queue("telegram-alerts", queueOpts);

export async function scheduleRecurringJobs() {
  await signalGenerationQueue.upsertJobScheduler(
    "generate-signals",
    { pattern: "*/5 * * * *" },
    { name: "generate-signals", data: {} },
  );

  await calendarSyncQueue.upsertJobScheduler(
    "fetch-calendar",
    { pattern: "0 * * * *" },
    { name: "fetch-calendar", data: {} },
  );

  await outcomeTrackerQueue.upsertJobScheduler(
    "check-signal-outcomes",
    { pattern: "*/5 * * * *" },
    { name: "check-signal-outcomes", data: {} },
  );
}
