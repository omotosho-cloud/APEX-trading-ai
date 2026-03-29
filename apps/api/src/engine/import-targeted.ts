import "dotenv/config";
import { tsdb } from "../db/client.js";
import { candles } from "../db/schema/index.js";
import { fetchTimeSeries, RATE_LIMIT_MS, sleep } from "./market-data/twelve-data-client.js";
import { ALL_INSTRUMENTS, TWELVE_DATA_SYMBOL, TWELVE_DATA_INTERVAL } from "./market-data/instruments.js";
import { sql } from "drizzle-orm";

// Only fetch timeframes useful for backtesting — skip M5/M15/M30/W1
const TARGET_TIMEFRAMES = ["H1", "H4", "D1"] as const;

const DAYS_PER_PAGE: Record<string, number> = {
  H1: 200,   // 5000 / 24 candles/day
  H4: 800,   // 5000 / 6 candles/day
  D1: 5000,  // full 5 years in one shot
};

function getStartDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 5);
  return d.toISOString().split("T")[0]!;
}

async function getLastCandleTime(instrument: string, timeframe: string): Promise<string | null> {
  const result = await tsdb
    .select({ maxTime: sql<string>`MAX(time)` })
    .from(candles)
    .where(sql`instrument = ${instrument} AND timeframe = ${timeframe}`);
  return result[0]?.maxTime ?? null;
}

async function importPair(instrument: string, timeframe: string): Promise<number> {
  const symbol = TWELVE_DATA_SYMBOL[instrument];
  const interval = TWELVE_DATA_INTERVAL[timeframe];
  if (!symbol || !interval) return 0;

  const lastTime = await getLastCandleTime(instrument, timeframe);
  let cursor = lastTime
    ? new Date(new Date(lastTime).getTime() + 60_000)
    : new Date(getStartDate());

  const now = new Date();
  if (cursor >= now) { process.stdout.write("already up to date "); return 0; }

  const daysPerPage = DAYS_PER_PAGE[timeframe] ?? 200;
  let total = 0;

  while (cursor < now) {
    const pageEnd = new Date(cursor);
    pageEnd.setDate(pageEnd.getDate() + daysPerPage);
    if (pageEnd > now) pageEnd.setTime(now.getTime());

    const startDate = cursor.toISOString().split("T")[0]!;
    const endDate   = pageEnd.toISOString().split("T")[0]!;

    const values = await fetchTimeSeries(symbol, interval, 5000, startDate, endDate);

    if (values.length === 0) {
      cursor = new Date(pageEnd.getTime() + 60_000);
      if (cursor < now) await sleep(RATE_LIMIT_MS);
      continue;
    }

    const rows = values.map((c) => ({
      time: new Date(c.datetime),
      instrument, timeframe,
      open: c.open, high: c.high, low: c.low, close: c.close,
      volume: c.volume ?? "0",
    }));

    const CHUNK = 500;
    for (let i = 0; i < rows.length; i += CHUNK) {
      await tsdb.insert(candles).values(rows.slice(i, i + CHUNK)).onConflictDoNothing();
    }

    total += rows.length;
    process.stdout.write(`+${rows.length} `);

    const lastCandle = values[values.length - 1]!;
    cursor = new Date(new Date(lastCandle.datetime).getTime() + 60_000);
    if (cursor < now) await sleep(RATE_LIMIT_MS);
  }

  return total;
}

async function run() {
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║   APEX — Twelve Data Targeted Import        ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`\nFetching H1, H4, D1 for all ${ALL_INSTRUMENTS.length} instruments`);
  console.log(`Start date: ${getStartDate()}\n`);

  let total = 0;
  let req = 0;
  const totalReqs = ALL_INSTRUMENTS.length * TARGET_TIMEFRAMES.length;

  for (const instrument of ALL_INSTRUMENTS) {
    for (const timeframe of TARGET_TIMEFRAMES) {
      req++;
      process.stdout.write(`[${req}/${totalReqs}] ${instrument.padEnd(10)} ${timeframe.padEnd(4)} ... `);
      try {
        const count = await importPair(instrument, timeframe);
        total += count;
        console.log(`${count} candles`);
      } catch (err) {
        console.error(`FAILED — ${err instanceof Error ? err.message : err}`);
      }
      if (req < totalReqs) await sleep(RATE_LIMIT_MS);
    }
  }

  console.log(`\n✅ Done. Total candles written: ${total.toLocaleString()}`);
  console.log("Run 'pnpm check:data' to verify, then 'pnpm backtest:live'\n");
  process.exit(0);
}

run().catch((err) => { console.error("Import failed:", err); process.exit(1); });
