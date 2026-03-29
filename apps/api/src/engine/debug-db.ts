import "dotenv/config";
import { tsdb } from "../db/client.js";
import { candles } from "../db/schema/index.js";
import { and, eq, sql } from "drizzle-orm";

// Check GBPUSD H1 — should have ~39k rows if dukascopy wrote correctly
const result = await tsdb
  .select({
    count: sql<string>`COUNT(*)`,
    min: sql<string>`MIN(time)`,
    max: sql<string>`MAX(time)`,
  })
  .from(candles)
  .where(and(eq(candles.instrument, "GBPUSD"), eq(candles.timeframe, "H1")));

console.log("GBPUSD H1:", result[0]);

// Check a sample row to confirm data format
const sample = await tsdb
  .select()
  .from(candles)
  .where(and(eq(candles.instrument, "GBPUSD"), eq(candles.timeframe, "H1")))
  .limit(1);

console.log("Sample row:", sample[0]);

process.exit(0);
