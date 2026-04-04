import "dotenv/config";
import { tsdb } from "../db/client.js";
import { candles } from "../db/schema/index.js";
import { sql } from "drizzle-orm";

async function run() {
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║     APEX — Wipe Candles Table               ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  const before = await tsdb.select({ count: sql<number>`COUNT(*)` }).from(candles);
  console.log(`  Rows before: ${Number(before[0]?.count).toLocaleString()}`);

  console.log("  Deleting all candles...");
  await tsdb.delete(candles);

  const after = await tsdb.select({ count: sql<number>`COUNT(*)` }).from(candles);
  console.log(`  Rows after:  ${Number(after[0]?.count).toLocaleString()}`);

  console.log("\n  ✅ Done. Now run:");
  console.log("     C:/Python313/python.exe apps/api/scripts/mt5_fetch.py --from 2020-01-01\n");

  process.exit(0);
}

run().catch((err) => { console.error("Failed:", err); process.exit(1); });
