import { Worker } from "bullmq";
import { db, tsdb } from "../db/client.js";
import { signals, signalOutcomes, candles } from "../db/schema/index.js";
import { eq, and, desc, gte } from "drizzle-orm";
import { parseRedisUrl, REDIS_URL } from "../redis-connection.js";

const TIMEFRAME = "H4";

async function checkOutcomes() {
  // Fetch all active H4 signals
  const activeSignals = await db
    .select()
    .from(signals)
    .where(and(eq(signals.is_active, true), eq(signals.timeframe, TIMEFRAME)))
    .limit(100);

  if (activeSignals.length === 0) return 0;

  let closed = 0;

  for (const signal of activeSignals) {
    const entry    = parseFloat(signal.entry_price);
    const sl       = parseFloat(signal.sl_price);
    const tp1      = parseFloat(signal.tp1_price);
    const tp2      = parseFloat(signal.tp2_price);
    const tp3      = signal.tp3_price ? parseFloat(signal.tp3_price) : null;
    const isBuy    = signal.direction === "buy";
    const firedAt  = new Date(signal.fired_at);

    // Fetch H4 candles since signal fired
    const bars = await tsdb
      .select()
      .from(candles)
      .where(
        and(
          eq(candles.instrument, signal.instrument),
          eq(candles.timeframe, TIMEFRAME),
          gte(candles.time, firedAt),
        ),
      )
      .orderBy(desc(candles.time))
      .limit(120); // 120 H4 bars = 20 days

    if (bars.length === 0) continue;

    // Check if signal has expired by time
    const now = new Date();
    if (now > new Date(signal.valid_until)) {
      await closeSignal(signal.id, "expired", null, 0, 0, signal.regime);
      closed++;
      continue;
    }

    // Scan bars chronologically for TP/SL hit
    const chronological = [...bars].reverse();
    let outcome: string | null = null;
    let exitPrice: number | null = null;

    for (const bar of chronological) {
      const high = parseFloat(bar.high);
      const low  = parseFloat(bar.low);

      if (isBuy) {
        if (low <= sl)              { outcome = "sl";  exitPrice = sl;  break; }
        if (tp3 && high >= tp3)     { outcome = "tp3"; exitPrice = tp3; break; }
        if (high >= tp2)            { outcome = "tp2"; exitPrice = tp2; break; }
        if (high >= tp1)            { outcome = "tp1"; exitPrice = tp1; break; }
      } else {
        if (high >= sl)             { outcome = "sl";  exitPrice = sl;  break; }
        if (tp3 && low <= tp3)      { outcome = "tp3"; exitPrice = tp3; break; }
        if (low <= tp2)             { outcome = "tp2"; exitPrice = tp2; break; }
        if (low <= tp1)             { outcome = "tp1"; exitPrice = tp1; break; }
      }
    }

    if (!outcome || !exitPrice) continue;

    // Calculate pips gained
    const pipSize   = signal.instrument.includes("JPY") ? 0.01 : 0.0001;
    const pipsGained = (exitPrice - entry) / pipSize * (isBuy ? 1 : -1);

    // Calculate R:R achieved
    const slDist    = Math.abs(entry - sl);
    const exitDist  = Math.abs(exitPrice - entry);
    const rrAchieved = slDist > 0 ? exitDist / slDist : 0;

    await closeSignal(signal.id, outcome, exitPrice, pipsGained, rrAchieved, signal.regime);
    closed++;
  }

  return closed;
}

async function closeSignal(
  signalId: string,
  outcome: string,
  exitPrice: number | null,
  pipsGained: number,
  rrAchieved: number,
  regime: string,
) {
  await Promise.all([
    db.insert(signalOutcomes).values({
      signal_id:       signalId,
      outcome,
      exit_price:      exitPrice?.toString() ?? null,
      pips_gained:     pipsGained.toFixed(2),
      rr_achieved:     rrAchieved.toFixed(2),
      regime_snapshot: { regime },
      closed_at:       new Date(),
    }),
    db.update(signals)
      .set({ is_active: false, status: outcome === "sl" ? "FILLED" : "FILLED", filled_at: new Date() })
      .where(eq(signals.id, signalId)),
  ]);

  console.log(`[OutcomeTracker] Signal ${signalId} closed — ${outcome} @ ${exitPrice?.toFixed(5) ?? "expired"} (${pipsGained.toFixed(1)} pips)`);
}

export const outcomeTrackerWorker = new Worker(
  "outcome-tracker",
  async () => {
    const closed = await checkOutcomes();
    if (closed > 0) console.log(`[OutcomeTracker] Closed ${closed} signals`);
  },
  { connection: parseRedisUrl(REDIS_URL) },
);

outcomeTrackerWorker.on("failed", (job, err) => {
  console.error(`[OutcomeTracker] Job ${job?.id} failed:`, err.message);
});
