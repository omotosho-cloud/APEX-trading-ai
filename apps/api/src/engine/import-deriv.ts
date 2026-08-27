/**
 * Deriv Historical Candle Importer
 *
 * Fetches OHLCV candle history for synthetic indices from the Deriv API
 * and writes them into TimescaleDB in the same format as all other instruments.
 *
 * Usage:
 *   pnpm import:deriv                          → all instruments, all timeframes
 *   pnpm import:deriv --instrument R_75        → single instrument, all timeframes
 *   pnpm import:deriv --instrument R_75 --tf M5 → single instrument + timeframe
 *
 * Deriv candles API:
 *   wss://ws.derivws.com/websockets/v3?app_id=<APP_ID>
 *   Request: { ticks_history: "R_75", granularity: 300, count: 5000, style: "candles" }
 *   Max 5000 candles per request. We page backwards from today.
 *
 * Rate limits: Deriv allows ~30 req/s — we stay conservative at 1 req/500ms.
 */

import "dotenv/config";
import WebSocket from "ws";
import { tsdb } from "../db/client.js";
import { candles } from "../db/schema/index.js";
import { sql } from "drizzle-orm";
import {
  SYNTHETIC_INSTRUMENTS,
  DERIV_SYMBOL,
  DERIV_GRANULARITY,
} from "./market-data/instruments.js";

// ── Config ────────────────────────────────────────────────────────────────────

const DERIV_WS_URL = process.env.DERIV_WS_URL ?? "wss://ws.derivws.com/websockets/v3";
const DERIV_APP_ID = process.env.DERIV_APP_ID ?? "1089";
const DERIV_API_TOKEN = process.env.DERIV_API_TOKEN ?? "";

// Timeframes to import for synthetics — M5 is critical for the strategies
const IMPORT_TIMEFRAMES = ["M5", "M15", "M30", "H1", "H4"] as const;

// Max candles per API request (Deriv hard limit)
const CANDLES_PER_PAGE = 5000;

// Delay between requests in ms (conservative — Deriv allows much higher)
const REQUEST_DELAY_MS = 500;

// How many years back to import
const YEARS_BACK = 3;

// ── Types ─────────────────────────────────────────────────────────────────────

type DerivCandle = {
  epoch: number;
  open:  number;
  high:  number;
  low:   number;
  close: number;
};

type DerivCandleResponse = {
  msg_type: "candles";
  candles:  DerivCandle[];
  error?:   { code: string; message: string };
};

type DerivGenericMsg = {
  msg_type: string;
  error?:   { code: string; message: string };
  [key: string]: unknown;
};

// ── WebSocket wrapper ─────────────────────────────────────────────────────────
// Deriv uses WebSocket for all API calls, including historical data.
// We create one persistent connection and send requests over it sequentially.

class DerivClient {
  private ws: WebSocket | null = null;
  private pendingResolve: ((msg: DerivGenericMsg) => void) | null = null;
  private pendingReject:  ((err: Error) => void) | null = null;
  private connected = false;

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `${DERIV_WS_URL}?app_id=${DERIV_APP_ID}`;
      this.ws = new WebSocket(url);

      this.ws.on("open", () => {
        // If an API token is provided, authorize first before making requests.
        // Authorization unlocks full history access on the account.
        if (DERIV_API_TOKEN) {
          this.ws!.send(JSON.stringify({ authorize: DERIV_API_TOKEN }));
          // Wait for auth response before resolving
          const authCheck = (raw: Buffer) => {
            try {
              const msg = JSON.parse(raw.toString()) as DerivGenericMsg;
              if (msg.msg_type === "authorize") {
                this.ws!.off("message", authCheck);
                if (msg.error) {
                  reject(new Error(`Deriv auth failed: ${msg.error.message}`));
                } else {
                  this.connected = true;
                  resolve();
                }
              }
            } catch { /* ignore */ }
          };
          this.ws!.on("message", authCheck);
        } else {
          this.connected = true;
          resolve();
        }
      });

      this.ws.on("message", (raw: Buffer) => {
        try {
          const msg = JSON.parse(raw.toString()) as DerivGenericMsg;
          if (msg.msg_type === "pong") return;
          if (this.pendingResolve) {
            this.pendingResolve(msg);
            this.pendingResolve = null;
            this.pendingReject  = null;
          }
        } catch {
          // ignore
        }
      });

      this.ws.on("error", (err) => {
        if (this.pendingReject) {
          this.pendingReject(err);
          this.pendingResolve = null;
          this.pendingReject  = null;
        }
        if (!this.connected) reject(err);
      });

      this.ws.on("close", () => {
        this.connected = false;
      });
    });
  }

  send<T extends DerivGenericMsg>(payload: object): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.ws || !this.connected) {
        reject(new Error("WebSocket not connected"));
        return;
      }
      this.pendingResolve = (msg) => resolve(msg as T);
      this.pendingReject  = reject;
      this.ws.send(JSON.stringify(payload));
    });
  }

  close() {
    this.ws?.terminate();
  }
}

// ── Candle fetcher ────────────────────────────────────────────────────────────

async function fetchCandlePage(
  client:      DerivClient,
  symbol:      string,
  granularity: number,
  endEpoch:    number,
): Promise<DerivCandle[]> {
  const response = await client.send<DerivCandleResponse>({
    ticks_history: symbol,
    granularity,
    count:         CANDLES_PER_PAGE,
    end:           endEpoch,
    style:         "candles",
    adjust_start_time: 1,
  });

  if (response.error) {
    throw new Error(`Deriv API error: ${response.error.code} — ${response.error.message}`);
  }

  if (response.msg_type !== "candles") {
    throw new Error(`Unexpected message type: ${response.msg_type}`);
  }

  return response.candles ?? [];
}

// ── DB helpers ────────────────────────────────────────────────────────────────

async function getEarliestCandleTime(
  instrument: string,
  timeframe:  string,
): Promise<number | null> {
  const result = await tsdb
    .select({ minTime: sql<string>`MIN(time)` })
    .from(candles)
    .where(sql`instrument = ${instrument} AND timeframe = ${timeframe}`);
  const t = result[0]?.minTime;
  return t ? Math.floor(new Date(t).getTime() / 1000) : null;
}

async function writeCandlePage(
  instrument: string,
  timeframe:  string,
  bars:       DerivCandle[],
): Promise<number> {
  if (bars.length === 0) return 0;

  const rows = bars.map((b) => ({
    time:       new Date(b.epoch * 1000),
    instrument,
    timeframe,
    open:       b.open.toString(),
    high:       b.high.toString(),
    low:        b.low.toString(),
    close:      b.close.toString(),
    volume:     "1", // Deriv candles don't have volume — use 1 as tick placeholder
  }));

  const CHUNK = 500;
  let written = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await tsdb
      .insert(candles)
      .values(rows.slice(i, i + CHUNK))
      .onConflictDoNothing();
    written += Math.min(CHUNK, rows.length - i);
  }
  return written;
}

// ── Per-instrument importer ───────────────────────────────────────────────────

async function importInstrument(
  client:      DerivClient,
  instrument:  string,
  timeframe:   string,
): Promise<number> {
  const symbol      = DERIV_SYMBOL[instrument];
  const granularity = DERIV_GRANULARITY[timeframe];

  if (!symbol || !granularity) {
    console.warn(`    Skipping ${instrument} ${timeframe} — no Deriv mapping`);
    return 0;
  }

  // Fetch from earliest existing candle backward, or from today if no data
  const earliestEpoch = await getEarliestCandleTime(instrument, timeframe);
  const cutoffEpoch   = Math.floor(Date.now() / 1000) - YEARS_BACK * 365 * 24 * 3600;

  // If we already have data going back to the cutoff, skip
  if (earliestEpoch !== null && earliestEpoch <= cutoffEpoch) {
    console.log(`    ${instrument.padEnd(12)} ${timeframe.padEnd(4)} already complete`);
    return 0;
  }

  // Start paging from: earliest we have (if any), otherwise now
  let cursor = earliestEpoch ?? Math.floor(Date.now() / 1000);
  let total  = 0;
  let pages  = 0;

  while (cursor > cutoffEpoch) {
    let bars: DerivCandle[];

    try {
      bars = await fetchCandlePage(client, symbol, granularity, cursor);
    } catch (err) {
      console.error(`    Error fetching ${instrument} ${timeframe}: ${err instanceof Error ? err.message : err}`);
      break;
    }

    if (bars.length === 0) break;

    const written = await writeCandlePage(instrument, timeframe, bars);
    total  += written;
    pages  += 1;

    // Move cursor back to just before the oldest candle in this page
    const oldestEpoch = bars[0]!.epoch;
    cursor = oldestEpoch - 1;

    // If we got fewer candles than requested we've hit the beginning of history
    if (bars.length < CANDLES_PER_PAGE) break;

    await sleep(REQUEST_DELAY_MS);
  }

  const latestBar  = await tsdb
    .select({ maxTime: sql<string>`MAX(time)`, minTime: sql<string>`MIN(time)` })
    .from(candles)
    .where(sql`instrument = ${instrument} AND timeframe = ${timeframe}`);

  const range = latestBar[0];
  const from  = range?.minTime ? new Date(range.minTime).toISOString().slice(0, 10) : "?";
  const to    = range?.maxTime ? new Date(range.maxTime).toISOString().slice(0, 10) : "?";

  console.log(
    `    ${instrument.padEnd(12)} ${timeframe.padEnd(4)} ${String(total).padStart(7)} candles  (${from} → ${to})  [${pages} pages]`,
  );

  return total;
}

// ── CLI arg parser ────────────────────────────────────────────────────────────

function parseArgs(): { instrument: string | null; tf: string | null } {
  const args = process.argv.slice(2);
  let instrument: string | null = null;
  let tf: string | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--instrument" && args[i + 1]) instrument = args[++i]!;
    if (args[i] === "--tf"         && args[i + 1]) tf         = args[++i]!;
  }

  return { instrument, tf };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  const { instrument: cliInstrument, tf: cliTf } = parseArgs();

  const instruments = cliInstrument
    ? [cliInstrument]
    : [...SYNTHETIC_INSTRUMENTS];

  const timeframes = cliTf
    ? [cliTf]
    : [...IMPORT_TIMEFRAMES];

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║        APEX — Deriv Synthetic Historical Import          ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`\n  Instruments : ${instruments.join(", ")}`);
  console.log(`  Timeframes  : ${timeframes.join(", ")}`);
  console.log(`  Years back  : ${YEARS_BACK}`);
  console.log(`  App ID      : ${DERIV_APP_ID}\n`);

  const client = new DerivClient();

  try {
    process.stdout.write("  Connecting to Deriv WebSocket ... ");
    await client.connect();
    console.log("connected\n");
  } catch (err) {
    console.error(`\n  Failed to connect: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }

  let grandTotal = 0;

  for (const instrument of instruments) {
    console.log(`  ── ${instrument} ─────────────────────────`);
    for (const tf of timeframes) {
      const count = await importInstrument(client, instrument, tf);
      grandTotal += count;
      // Small pause between timeframes of the same instrument
      await sleep(REQUEST_DELAY_MS);
    }
  }

  client.close();

  console.log(`\n  ✅ Import complete.`);
  console.log(`  Total candles written: ${grandTotal.toLocaleString()}`);
  console.log(`\n  Next steps:`);
  console.log(`    pnpm backtest:ema-scalp  --instrument R_75`);
  console.log(`    pnpm backtest:ema-flip   --instrument R_75\n`);

  process.exit(0);
}

run().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
