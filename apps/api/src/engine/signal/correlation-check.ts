import { db } from "../../db/client.js";
import { signals } from "../../db/schema/index.js";
import { and, eq, sql } from "drizzle-orm";

const CURRENCY_BUCKETS: Record<string, string[]> = {
  USD:    ["EURUSD","GBPUSD","USDJPY","USDCHF","AUDUSD","USDCAD","NZDUSD"],
  EUR:    ["EURUSD","EURGBP","EURJPY"],
  GBP:    ["GBPUSD","EURGBP","GBPJPY"],
  JPY:    ["USDJPY","EURJPY","GBPJPY"],
  CRYPTO: ["BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT","XRPUSDT"],
};

const MAX_PER_BUCKET = 2;

export async function checkCorrelationLimit(
  instrument: string,
): Promise<{ allowed: boolean; reason: string | null }> {
  const affectedBuckets = Object.entries(CURRENCY_BUCKETS)
    .filter(([, pairs]) => pairs.includes(instrument))
    .map(([bucket]) => bucket);

  for (const bucket of affectedBuckets) {
    const bucketPairs = CURRENCY_BUCKETS[bucket]!;

    const result = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(signals)
      .where(
        and(
          eq(signals.is_active, true),
          sql`instrument = ANY(${bucketPairs})`,
        ),
      );

    const count = Number(result[0]?.count ?? 0);
    if (count >= MAX_PER_BUCKET) {
      return {
        allowed: false,
        reason: `${bucket} bucket already has ${count} active signals`,
      };
    }
  }

  return { allowed: true, reason: null };
}
