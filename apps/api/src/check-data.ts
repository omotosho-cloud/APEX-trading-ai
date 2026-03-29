import "dotenv/config";
import { tsdb } from "./db/client.js";
import { candles } from "./db/schema/index.js";
import { sql } from "drizzle-orm";

const result = await tsdb
  .select({
    instrument: candles.instrument,
    timeframe: candles.timeframe,
    count: sql<string>`COUNT(*)`,
    min_time: sql<string>`MIN(time)`,
    max_time: sql<string>`MAX(time)`,
  })
  .from(candles)
  .groupBy(candles.instrument, candles.timeframe)
  .orderBy(candles.instrument, candles.timeframe);

console.log("\n═══════════════════════════════════════════════════");
console.log("   Historical Candle Data Summary");
console.log("═══════════════════════════════════════════════════\n");

for (const row of result) {
  const count = Number(row.count);
  console.log(
    `${row.instrument}/${row.timeframe}`.padEnd(15) +
      ` | Count: ${String(count).padStart(6)} | ` +
      `${row.min_time} → ${row.max_time}`,
  );
}

console.log("\n✅ Total rows with data:", result.length);
console.log(
  "\n💡 Note: You need 250+ candles per pair/timeframe for backtesting\n",
);
