export function parseRedisUrl(url: string) {
  const parsed = new URL(url);
  const isTLS = url.startsWith("rediss://");
  return {
    host: parsed.hostname,
    port: Number(parsed.port) || 6379,
    ...(parsed.password ? { password: decodeURIComponent(parsed.password) } : {}),
    ...(isTLS ? { tls: {} } : {}),
    maxRetriesPerRequest: null as null,
    enableReadyCheck: false,
    lazyConnect: true,
  };
}

export const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
