import { db } from "../../db/client.js";
import { signals } from "../../db/schema/index.js";
import { and, eq, sql } from "drizzle-orm";

// ── Currency correlation buckets ──────────────────────────────────────────────
// Instruments in the same bucket are correlated — cap signals per bucket
// to avoid stacking risk on the same currency.

const CURRENCY_BUCKETS: Record<string, string[]> = {
  USD: [
    "EURUSD", "GBPUSD", "USDJPY", "USDCHF",
    "AUDUSD", "USDCAD", "NZDUSD",
  ],
  EUR: [
    "EURUSD", "EURGBP", "EURJPY", "EURCHF",
    "EURAUD", "EURCAD",
  ],
  GBP: [
    "GBPUSD", "EURGBP", "GBPJPY", "GBPCHF",
    "GBPAUD", "GBPCAD",
  ],
  JPY: [
    "USDJPY", "EURJPY", "GBPJPY", "AUDJPY",
    "CADJPY", "CHFJPY", "NZDJPY",
  ],
  AUD: [
    "AUDUSD", "EURAUD", "GBPAUD", "AUDJPY",
    "AUDNZD", "AUDCAD", "AUDCHF",
  ],
  CAD: [
    "USDCAD", "EURCAD", "GBPCAD", "CADJPY",
    "AUDCAD", "NZDCAD", "CADCHF",
  ],
  CHF: [
    "USDCHF", "EURCHF", "GBPCHF", "CHFJPY",
    "AUDCHF", "NZDCHF", "CADCHF",
  ],
  NZD: [
    "NZDUSD", "AUDNZD", "NZDJPY", "NZDCAD", "NZDCHF",
  ],
};

// Max concurrent active signals per currency bucket
const MAX_PER_BUCKET = 2;

function getBucketsFor(instrument: string): Array<{ name: string; members: string[] }> {
  return Object.entries(CURRENCY_BUCKETS)
    .filter(([, members]) => members.includes(instrument))
    .map(([name, members]) => ({ name, members }));
}

export async function checkCorrelationLimit(
  instrument: string,
): Promise<{ allowed: boolean; reason: string | null }> {
  const buckets = getBucketsFor(instrument);

  // Instrument not in any bucket — standalone, always allow
  if (buckets.length === 0) return { allowed: true, reason: null };

  for (const { name, members } of buckets) {
    const result = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(signals)
      .where(
        and(
          eq(signals.is_active, true),
          sql`instrument = ANY(${members})`,
        ),
      );

    const count = Number(result[0]?.count ?? 0);
    if (count >= MAX_PER_BUCKET) {
      return {
        allowed: false,
        reason: `${name} bucket already has ${count} active signal${count === 1 ? "" : "s"} (max ${MAX_PER_BUCKET})`,
      };
    }
  }

  return { allowed: true, reason: null };
}
