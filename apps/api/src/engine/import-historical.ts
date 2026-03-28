import "dotenv/config";
import { tsdb } from "../db/client.js";
import { candles } from "../db/schema/index.js";
import {
  fetchTimeSeries,
  RATE_LIMIT_MS,
  sleep,
} from "./market-data/twelve-data-client.js";
import {
  ALL_INSTRUMENTS,
  ALL_TIMEFRAMES,
  TWELVE_DATA_SYMBOL,
  TWELVE_DATA_INTERVAL,
} from "./market-data/instruments.js";
import { sql } from "drizzle-orm";

// 5 years back from today
function getStartDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 5);
  return d.toISOString().split("T")[0]!;
}

async function getLastCandleTime(
  instrument: string,
  timeframe: string,
): Promise<string | null> {
  const result = await tsdb
    .select({ maxTime: sql<string>`MAX(time)` })
    .from(candles)
    .where(
      sql`instrument = ${instrument} AND timeframe = ${timeframe}`,
    );
  return result[0]?.maxTime ?? null;
}

async function importInstrument(instrument: string, timeframe: string) {
  const symbol = TWELVE_DATA_SYMBOL[instrument];
  const interval = TWELVE_DATA_INTERVAL[timeframe];

  if (!symbol || !interval) {
    console.warn(`  Skipping unknown mapping: ${instrument} ${timeframe}`);
    return 0;
  }

  // Resume from last imported candle if exists
  const lastTime = await getLastCandleTime(instrument, timeframe);
  const startDate = lastTime
    ? new Date(new Date(lastTime).getTime() + 60_000).toISOString().split("T")[0]!
    : getStartDate();

  const values = await fetchTimeSeries(symbol, interval, 5000, startDate);

  if (values.length === 0) return 0;

  const rows = values.map((c) => ({
    time: new Date(c.datetime),
    instrument,
    timeframe,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume ?? "0",
  }));

  // Batch insert in chunks of 500 to avoid query size limits
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await tsdb
      .insert(candles)
      .values(rows.slice(i, i + CHUNK))
      .onConflictDoNothing();
  }

  return rows.length;
}

async function runImport() {
  const startDate = getStartDate();
  console.log(`\nAPEX Historical Import — start date: ${startDate}`);
  console.log(`Instruments: ${ALL_INSTRUMENTS.length} × Timeframes: ${ALL_TIMEFRAMES.length}`);
  console.log(`Total requests: ${ALL_INSTRUMENTS.length * ALL_TIMEFRAMES.length}\n`);

  let total = 0;
  let reqCount = 0;

  for (const instrument of ALL_INSTRUMENTS) {
    for (const timeframe of ALL_TIMEFRAMES) {
      reqCount++;
      process.stdout.write(
        `[${reqCount}/${ALL_INSTRUMENTS.length * ALL_TIMEFRAMES.length}] ${instrument} ${timeframe} ... `,
      );

      try {
        const count = await importInstrument(instrument, timeframe);
        total += count;
        console.log(`${count} candles`);
      } catch (err) {
        console.error(`FAILED — ${err instanceof Error ? err.message : err}`);
      }

      // Rate limit: 8 req/min on free tier — wait between each request
      if (reqCount < ALL_INSTRUMENTS.length * ALL_TIMEFRAMES.length) {
        await sleep(RATE_LIMIT_MS);
      }
    }
  }

  console.log(`\nImport complete. Total candles written: ${total}`);
  process.exit(0);
}

runImport().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
