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

// How many days per page per timeframe (keeps each request under 5000 candles)
const DAYS_PER_PAGE: Record<string, number> = {
  M5:  17,   // 5000 / (288 candles/day)
  M15: 50,   // 5000 / (96 candles/day)
  M30: 100,  // 5000 / (48 candles/day)
  H1:  200,  // 5000 / (24 candles/day)
  H4:  800,  // 5000 / (6 candles/day)
  D1:  5000, // 1 candle/day — full 5 years in one shot
  W1:  5000, // 1 candle/week — full 5 years in one shot
};

async function importInstrument(instrument: string, timeframe: string) {
  const symbol = TWELVE_DATA_SYMBOL[instrument];
  const interval = TWELVE_DATA_INTERVAL[timeframe];

  if (!symbol || !interval) {
    console.warn(`  Skipping unknown mapping: ${instrument} ${timeframe}`);
    return 0;
  }

  // Resume from last imported candle if exists
  const lastTime = await getLastCandleTime(instrument, timeframe);
  let cursor = lastTime
    ? new Date(new Date(lastTime).getTime() + 60_000)
    : new Date(getStartDate());

  const now = new Date();
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
      // No data in this window — advance cursor and continue
      cursor = new Date(pageEnd.getTime() + 60_000);
      continue;
    }

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

    const CHUNK = 500;
    for (let i = 0; i < rows.length; i += CHUNK) {
      await tsdb
        .insert(candles)
        .values(rows.slice(i, i + CHUNK))
        .onConflictDoNothing();
    }

    total += rows.length;

    // Advance cursor past the last candle we received
    const lastCandle = values[values.length - 1]!;
    cursor = new Date(new Date(lastCandle.datetime).getTime() + 60_000);

    // Rate limit between pages of the same instrument
    if (cursor < now) await sleep(RATE_LIMIT_MS);
  }

  return total;
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
        console.log(`${count} candles imported`);
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
