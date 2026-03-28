import { Redis } from "@upstash/redis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!redisUrl || !redisToken) {
  throw new Error("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required");
}

export const redis = new Redis({ url: redisUrl, token: redisToken });

export async function cacheGet<T>(key: string): Promise<T | null> {
  return redis.get<T>(key);
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
  if (ttlSeconds) {
    await redis.setex(key, ttlSeconds, value);
  } else {
    await redis.set(key, value);
  }
}

export async function cacheDel(key: string): Promise<void> {
  await redis.del(key);
}

// Cache key builders
export const CacheKeys = {
  activeSignals: () => "signals:active",
  signalsByInstrument: (instrument: string) => `signals:${instrument}`,
  regimeState: (instrument: string, timeframe: string) =>
    `regime:${instrument}:${timeframe}`,
  expertWeights: (instrument: string, regime: string, timeframe: string) =>
    `weights:${instrument}:${regime}:${timeframe}`,
  calendarEvents: () => "calendar:events",
  userSession: (userId: string) => `session:${userId}`,
} as const;
