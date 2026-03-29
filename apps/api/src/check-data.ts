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
    years: sql<string>`ROUND(EXTRACT(EPOCH FROM (MAX(time) - MIN(time))) / 86400 / 365, 1)`,
  })
  .from(candles)
  .groupBy(candles.instrument, candles.timeframe)
  .orderBy(candles.instrument, candles.timeframe);

console.log("\n" + "═".repeat(80));
console.log("   APEX — Full DB Candle Inventory");
console.log("═".repeat(80));
console.log(`${ "Pair/TF".padEnd(16) } ${ "Count".padStart(7) }  ${ "Years".padStart(5) }  From         → To`);
console.log("─".repeat(80));

for (const row of result) {
  const key = `${row.instrument}/${row.timeframe}`;
  const from = row.min_time.slice(0, 10);
  const to   = row.max_time.slice(0, 10);
  const count = Number(row.count).toLocaleString();
  const years = row.years;
  const flag = Number(years) >= 3 ? "✅" : Number(years) >= 1 ? "⚠️ " : "❌";
  console.log(`${flag} ${key.padEnd(15)} ${count.padStart(7)}  ${String(years).padStart(5)}y  ${from} → ${to}`);
}

console.log("─".repeat(80));
console.log(`\nTotal combinations: ${result.length}`);
console.log(`✅ = 3+ years  ⚠️  = 1-3 years  ❌ = <1 year\n`);

process.exit(0);
