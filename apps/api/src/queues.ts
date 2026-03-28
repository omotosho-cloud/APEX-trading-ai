import { Queue } from "bullmq";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

// Parse REDIS_URL into host/port for BullMQ connection config
function parseRedisUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port) || 6379,
    ...(parsed.password ? { password: parsed.password } : {}),
    maxRetriesPerRequest: null as null, // required by BullMQ
  };
}

const connection = parseRedisUrl(redisUrl);
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
