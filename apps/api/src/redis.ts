import { Redis } from "@upstash/redis";

let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    _redis = new Redis({ url, token });
    return _redis;
  } catch {
    return null;
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    return await getRedis()?.get<T>(key) ?? null;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
  try {
    const r = getRedis();
    if (!r) return;
    if (ttlSeconds) {
      await r.setex(key, ttlSeconds, value);
    } else {
      await r.set(key, value);
    }
  } catch {
    // non-fatal
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    await getRedis()?.del(key);
  } catch {
    // non-fatal
  }
}

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
