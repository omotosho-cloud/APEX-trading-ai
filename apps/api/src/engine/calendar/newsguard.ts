import { db } from "../../db/client.js";
import { calendarEvents } from "../../db/schema/index.js";
import { sql } from "drizzle-orm";
import { cacheGet, cacheSet } from "../../redis.js";

const RED_FOLDER_EVENTS = [
  "NFP", "Non-Farm", "CPI", "FOMC", "GDP",
  "Interest Rate", "Central Bank", "Fed", "ECB", "BOE", "BOJ", "RBA",
];

const SUPPRESSION_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
const CACHE_TTL = 60; // 1 minute cache

// Currency pairs affected by each currency
const CURRENCY_PAIRS: Record<string, string[]> = {
  USD: ["EURUSD","GBPUSD","USDJPY","USDCHF","AUDUSD","USDCAD","NZDUSD","EURJPY","GBPJPY"],
  EUR: ["EURUSD","EURGBP","EURJPY"],
  GBP: ["GBPUSD","EURGBP","GBPJPY"],
  JPY: ["USDJPY","EURJPY","GBPJPY"],
  AUD: ["AUDUSD"],
  CAD: ["USDCAD"],
  NZD: ["NZDUSD"],
  CHF: ["USDCHF"],
};

export type NewsGuardResult = {
  suppressed: boolean;
  reason: string | null;
  eventTitle: string | null;
};

export async function checkNewsGuard(instrument: string): Promise<NewsGuardResult> {
  const cacheKey = `newsguard:${instrument}`;
  const cached = await cacheGet<NewsGuardResult>(cacheKey);
  if (cached) return cached;

  const now = new Date();
  const windowStart = new Date(now.getTime() - SUPPRESSION_WINDOW_MS);
  const windowEnd = new Date(now.getTime() + SUPPRESSION_WINDOW_MS);

  // Find affected currencies for this instrument
  const affectedCurrencies = Object.entries(CURRENCY_PAIRS)
    .filter(([, pairs]) => pairs.includes(instrument))
    .map(([currency]) => currency);

  if (affectedCurrencies.length === 0) {
    return { suppressed: false, reason: null, eventTitle: null };
  }

  const events = await db
    .select()
    .from(calendarEvents)
    .where(
      sql`event_time BETWEEN ${windowStart.toISOString()} AND ${windowEnd.toISOString()}
          AND impact = 'high'
          AND currency = ANY(${affectedCurrencies})`,
    )
    .limit(5);

  const redEvent = events.find((e) =>
    RED_FOLDER_EVENTS.some((keyword) =>
      e.title.toLowerCase().includes(keyword.toLowerCase()),
    ),
  );

  const result: NewsGuardResult = redEvent
    ? {
        suppressed: true,
        reason: "EXTREME_VOLATILITY",
        eventTitle: redEvent.title,
      }
    : { suppressed: false, reason: null, eventTitle: null };

  await cacheSet(cacheKey, result, CACHE_TTL);
  return result;
}
