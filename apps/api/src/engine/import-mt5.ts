import "dotenv/config";
import { tsdb } from "../db/client.js";
import { candles } from "../db/schema/index.js";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

// Default path — override with: MT5_DATA_PATH=C:\your\path pnpm import:mt5
const DATA_PATH = process.env.MT5_DATA_PATH ?? "C:\\apex-data";

type CandleRow = {
  time: Date;
  instrument: string;
  timeframe: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
};

function parseCSV(filepath: string, instrument: string, timeframe: string): CandleRow[] {
  const content = readFileSync(filepath, "utf-8");
  const lines = content.trim().split("\n");

  // Skip header
  const rows: CandleRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line) continue;

    const parts = line.split(",");
    if (parts.length < 6) continue;

    const [timeStr, open, high, low, close, volume] = parts;
    if (!timeStr || !open || !high || !low || !close) continue;

    // MT5 exports time as "2024.01.15 09:00" or "2024-01-15 09:00"
    const normalized = timeStr.replace(/\./g, "-").trim();
    const time = new Date(normalized);
    if (isNaN(time.getTime())) continue;

    rows.push({
      time,
      instrument,
      timeframe,
      open:   parseFloat(open).toString(),
      high:   parseFloat(high).toString(),
      low:    parseFloat(low).toString(),
      close:  parseFloat(close).toString(),
      volume: parseFloat(volume ?? "0").toString(),
    });
  }

  return rows;
}

async function insertRows(rows: CandleRow[]) {
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await tsdb
      .insert(candles)
      .values(rows.slice(i, i + CHUNK))
      .onConflictDoNothing();
  }
}

async function run() {
  if (!existsSync(DATA_PATH)) {
    console.error(`\n❌ Data path not found: ${DATA_PATH}`);
    console.error(`   Run the MT5 export script first, or set MT5_DATA_PATH env var\n`);
    process.exit(1);
  }

  const files = readdirSync(DATA_PATH).filter((f) => f.endsWith(".csv"));

  if (files.length === 0) {
    console.error(`\n❌ No CSV files found in: ${DATA_PATH}\n`);
    process.exit(1);
  }

  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║       APEX — MT5 Historical Import          ║`);
  console.log(`╚══════════════════════════════════════════════╝`);
  console.log(`\n  Source: ${DATA_PATH}`);
  console.log(`  Files found: ${files.length}\n`);

  let totalCandles = 0;

  for (const file of files.sort()) {
    // Expect filename format: EURUSD_H4.csv
    const name = file.replace(".csv", "");
    const parts = name.split("_");
    if (parts.length < 2) {
      console.log(`  ⚠️  Skipping unrecognised filename: ${file}`);
      continue;
    }

    const instrument = parts[0]!.toUpperCase();
    const timeframe  = parts[1]!.toUpperCase();

    process.stdout.write(`  ${instrument.padEnd(10)} ${timeframe.padEnd(4)} ... `);

    try {
      const rows = parseCSV(join(DATA_PATH, file), instrument, timeframe);
      if (rows.length === 0) { console.log("0 rows parsed — check CSV format"); continue; }

      await insertRows(rows);
      totalCandles += rows.length;
      console.log(`${rows.length.toLocaleString()} candles  (${rows[0]!.time.toISOString().slice(0,10)} → ${rows[rows.length-1]!.time.toISOString().slice(0,10)})`);
    } catch (err) {
      console.error(`FAILED — ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`\n  ✅ Import complete. Total candles written: ${totalCandles.toLocaleString()}`);
  console.log(`  Run 'pnpm check:data' to verify, then 'pnpm backtest:live'\n`);
  process.exit(0);
}

run().catch((err) => { console.error("Import failed:", err); process.exit(1); });
