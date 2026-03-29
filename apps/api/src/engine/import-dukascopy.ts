import "dotenv/config";
import { getHistoricalRates } from "dukascopy-node";
import { tsdb } from "../db/client.js";
import { candles } from "../db/schema/index.js";
import { sql } from "drizzle-orm";

const FOREX_PAIRS: Record<string, string> = {
  EURUSD: "eurusd", GBPUSD: "gbpusd", USDJPY: "usdjpy",
  USDCHF: "usdchf", AUDUSD: "audusd", NZDUSD: "nzdusd",
  USDCAD: "usdcad", EURGBP: "eurgbp", EURJPY: "eurjpy", GBPJPY: "gbpjpy",
};

const TIMEFRAMES: Record<string, "h1" | "h4" | "d1"> = {
  H1: "h1", H4: "h4", D1: "d1",
};

const FROM = new Date("2020-01-01");
const TO   = new Date();

async function importPair(instrument: string, dukaPair: string, timeframe: string, dukaTimeframe: "h1" | "h4" | "d1") {
  process.stdout.write(`  ${instrument.padEnd(10)} ${timeframe.padEnd(4)} ... `);

  try {
    // Check what's already in DB
    const existing = await tsdb
      .select({ maxTime: sql<string>`MAX(time)` })
      .from(candles)
      .where(sql`instrument = ${instrument} AND timeframe = ${timeframe}`);

    const lastTime = existing[0]?.maxTime;
    const from = lastTime ? new Date(new Date(lastTime).getTime() + 3_600_000) : FROM;

    if (from >= TO) {
      console.log("already up to date");
      return 0;
    }

    const data = await getHistoricalRates({
      instrument: dukaPair as any,
      dates: { from, to: TO },
      timeframe: dukaTimeframe,
      format: "array",
      flushCache: false,
    });

    if (!data || data.length === 0) {
      console.log("no data");
      return 0;
    }

    const rows = (data as number[][]).map((bar) => ({
      time:       new Date(bar[0]!),
      instrument,
      timeframe,
      open:   bar[1]!.toString(),
      high:   bar[2]!.toString(),
      low:    bar[3]!.toString(),
      close:  bar[4]!.toString(),
      volume: (bar[5] ?? 0).toString(),
    }));

    const CHUNK = 500;
    for (let i = 0; i < rows.length; i += CHUNK) {
      await tsdb.insert(candles).values(rows.slice(i, i + CHUNK)).onConflictDoNothing();
    }

    console.log(`${rows.length.toLocaleString()} candles  (${rows[0]!.time.toISOString().slice(0,10)} → ${rows[rows.length-1]!.time.toISOString().slice(0,10)})`);
    return rows.length;
  } catch (err) {
    console.error(`FAILED — ${err instanceof Error ? err.message : err}`);
    return 0;
  }
}

async function run() {
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║   APEX — Dukascopy Historical Import        ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`\nFetching H1, H4, D1 | 2020-01-01 → today | 10 forex pairs\n`);

  let total = 0;

  for (const [instrument, dukaPair] of Object.entries(FOREX_PAIRS)) {
    for (const [timeframe, dukaTimeframe] of Object.entries(TIMEFRAMES)) {
      const count = await importPair(instrument, dukaPair, timeframe, dukaTimeframe);
      total += count;
    }
  }

  console.log(`\n✅ Done. Total candles written: ${total.toLocaleString()}`);
  console.log("Run 'pnpm check:data' then 'pnpm backtest:live'\n");
  process.exit(0);
}

run().catch((err) => { console.error("Import failed:", err); process.exit(1); });
