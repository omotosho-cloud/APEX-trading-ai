import "dotenv/config";
import { tsdb } from "../db/client.js";
import { candles } from "../db/schema/index.js";
import { sql, eq } from "drizzle-orm";

const rows = await tsdb
  .select({
    timeframe: candles.timeframe,
    count:     sql<number>`COUNT(*)`,
    from_date: sql<string>`MIN(time)::date`,
    to_date:   sql<string>`MAX(time)::date`,
  })
  .from(candles)
  .where(eq(candles.instrument, "R_75"))
  .groupBy(candles.timeframe)
  .orderBy(candles.timeframe);

console.log("\nR_75 candle data in database:\n");
console.log("Timeframe  Count      From         To");
console.log("─".repeat(48));
for (const r of rows) {
  console.log(
    `  ${r.timeframe.padEnd(8)} ${String(r.count).padStart(8)}   ${r.from_date}  →  ${r.to_date}`,
  );
}
if (rows.length === 0) console.log("  No data found for R_75");
console.log("");
process.exit(0);
