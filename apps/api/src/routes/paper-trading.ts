import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import { signals, signalOutcomes } from "../db/schema/index.js";
import { eq, desc, inArray, and } from "drizzle-orm";

const ACTIVE_PAIRS = ["EURUSD", "USDJPY", "USDCHF", "NZDUSD", "GBPUSD"];
const TIMEFRAME    = "H4";

export async function paperTradingRoutes(server: FastifyInstance) {
  server.get("/api/paper-trading/metrics", async (_req, reply) => {
    try {
      // Active H4 signals for approved pairs only
      const activeSignals = await db
        .select()
        .from(signals)
        .where(
          and(
            eq(signals.is_active, true),
            eq(signals.timeframe, TIMEFRAME),
            inArray(signals.instrument, ACTIVE_PAIRS),
          ),
        )
        .orderBy(desc(signals.fired_at))
        .limit(50);

      // Closed signals with outcomes — H4 approved pairs only
      const closed = await db
        .select({ signal: signals, outcome: signalOutcomes })
        .from(signals)
        .leftJoin(signalOutcomes, eq(signalOutcomes.signal_id, signals.id))
        .where(
          and(
            eq(signals.is_active, false),
            eq(signals.timeframe, TIMEFRAME),
            inArray(signals.instrument, ACTIVE_PAIRS),
          ),
        )
        .orderBy(desc(signals.fired_at))
        .limit(500);

      const withOutcome = closed.filter((s) => s.outcome !== null);

      // Outcome classification matching backtest model
      const wins      = withOutcome.filter((s) => ["tp1","tp2","tp3"].includes(s.outcome!.outcome));
      const losses    = withOutcome.filter((s) => s.outcome!.outcome === "sl");
      const expired   = withOutcome.filter((s) => s.outcome!.outcome === "expired");
      const tp1Hits   = withOutcome.filter((s) => s.outcome!.outcome === "tp1");
      const tp2Hits   = withOutcome.filter((s) => s.outcome!.outcome === "tp2");
      const tp3Hits   = withOutcome.filter((s) => s.outcome!.outcome === "tp3");

      const total   = withOutcome.length;
      const winRate = total > 0 ? (wins.length / total) * 100 : 0;

      // Net R (matching backtest partial close model)
      const netR = withOutcome.reduce((sum, s) => {
        const rr = parseFloat(s.signal.rr_ratio);
        switch (s.outcome!.outcome) {
          case "tp3": return sum + (0.5 * rr + 0.3 * rr * 2 + 0.2 * rr * 3.33);
          case "tp2": return sum + (0.5 * rr + 0.5 * rr * 2);
          case "tp1": return sum + (0.5 * rr + 0.5 * rr);
          case "sl":  return sum - 1;
          default:    return sum - 0.2;
        }
      }, 0);

      // Per-pair breakdown
      const byPair: Record<string, { trades: number; wins: number; losses: number; winRate: number; netR: number }> = {};
      for (const pair of ACTIVE_PAIRS) {
        const pairTrades = withOutcome.filter((s) => s.signal.instrument === pair);
        const pairWins   = pairTrades.filter((s) => ["tp1","tp2","tp3"].includes(s.outcome!.outcome));
        const pairLosses = pairTrades.filter((s) => s.outcome!.outcome === "sl");
        const pairNetR   = pairTrades.reduce((sum, s) => {
          const rr = parseFloat(s.signal.rr_ratio);
          switch (s.outcome!.outcome) {
            case "tp2": return sum + (0.5 * rr + 0.5 * rr * 2);
            case "tp1": return sum + rr;
            case "sl":  return sum - 1;
            default:    return sum - 0.2;
          }
        }, 0);
        byPair[pair] = {
          trades:  pairTrades.length,
          wins:    pairWins.length,
          losses:  pairLosses.length,
          winRate: pairTrades.length > 0 ? Math.round(pairWins.length / pairTrades.length * 1000) / 10 : 0,
          netR:    Math.round(pairNetR * 100) / 100,
        };
      }

      // Hours running
      const allSignals = await db.select({ fired_at: signals.fired_at }).from(signals).orderBy(signals.fired_at).limit(1);
      const hoursRunning = allSignals.length > 0
        ? (Date.now() - new Date(allSignals[0]!.fired_at).getTime()) / 3_600_000
        : 0;

      return reply.send({
        metrics: {
          totalSignals:  activeSignals.length + closed.length,
          activeCount:   activeSignals.length,
          closedCount:   closed.length,
          winRate:       Math.round(winRate * 10) / 10,
          wins:          wins.length,
          losses:        losses.length,
          expired:       expired.length,
          tp1Hits:       tp1Hits.length,
          tp2Hits:       tp2Hits.length,
          tp3Hits:       tp3Hits.length,
          netR:          Math.round(netR * 100) / 100,
          hoursRunning:  Math.round(hoursRunning * 10) / 10,
          byPair,
          // Backtest targets for comparison
          targets: { winRate: 54.7, sharpe: 1.72, maxDD: 25 },
        },
        activeSignals,
      });
    } catch (error) {
      console.error("[PaperTrading] Error:", error);
      return reply.status(500).send({ error: "Failed to calculate metrics" });
    }
  });
}
