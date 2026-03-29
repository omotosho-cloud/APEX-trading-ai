import type { FastifyInstance } from "fastify";
import { db, tsdb } from "../db/client.js";
import { signals, signalOutcomes } from "../db/schema/index.js";
import { eq, desc, sql, and, isNull, gte } from "drizzle-orm";

export async function paperTradingRoutes(server: FastifyInstance) {
  // GET /api/paper-trading/metrics - Real-time paper trading analytics
  server.get("/api/paper-trading/metrics", async (_req, reply) => {
    try {
      // Fetch all signals with outcomes
      const [activeSignals, closedSignals] = await Promise.all([
        db
          .select()
          .from(signals)
          .where(eq(signals.is_active, true))
          .orderBy(desc(signals.fired_at))
          .limit(100),

        db
          .select({
            signal: signals,
            outcome: signalOutcomes,
          })
          .from(signals)
          .leftJoin(signalOutcomes, eq(signalOutcomes.signal_id, signals.id))
          .where(eq(signals.is_active, false))
          .orderBy(desc(signals.fired_at))
          .limit(500),
      ]);

      // Calculate metrics
      const totalSignals = activeSignals.length + closedSignals.length;
      const activeCount = activeSignals.length;
      const closedCount = closedSignals.length;

      // Filter closed signals with outcomes
      const signalsWithOutcome = closedSignals.filter(
        (s) => s.outcome !== null,
      );

      const wins = signalsWithOutcome.filter(
        (s) => s.outcome?.outcome === "WIN",
      ).length;
      const losses = signalsWithOutcome.filter(
        (s) => s.outcome?.outcome === "LOSS",
      ).length;
      const breakevens = signalsWithOutcome.filter(
        (s) => s.outcome?.outcome === "BREAKEVEN",
      ).length;

      const winRate =
        signalsWithOutcome.length > 0
          ? (wins / signalsWithOutcome.length) * 100
          : 0;
      const accuracyRate = winRate; // For now, accuracy = win rate

      // TP hit tracking
      const tp1Hits = signalsWithOutcome.filter((s) => {
        const pips = parseFloat(s.outcome?.pips_gained || "0");
        return pips > 0;
      }).length;

      const tp2Hits = signalsWithOutcome.filter((s) => {
        const rr = parseFloat(s.outcome?.rr_achieved || "0");
        return rr >= 2.0;
      }).length;

      const tp3Hits = signalsWithOutcome.filter((s) => {
        const rr = parseFloat(s.outcome?.rr_achieved || "0");
        return rr >= 3.0;
      }).length;

      const slHits = losses;

      // TP1 accuracy (Phase 3 validation metric)
      const tp1Accuracy =
        signalsWithOutcome.length > 0
          ? (tp1Hits / signalsWithOutcome.length) * 100
          : 0;

      // Average R:R
      const averageRR =
        signalsWithOutcome.reduce((acc, s) => {
          return acc + parseFloat(s.signal.rr_ratio);
        }, 0) / signalsWithOutcome.length || 0;

      // Net P&L (sum of all pips gained)
      const netPnL = signalsWithOutcome.reduce((acc, s) => {
        return acc + parseFloat(s.outcome?.pips_gained || "0");
      }, 0);

      // Hours running (from first signal)
      const firstSignal = await db
        .select({ fired_at: signals.fired_at })
        .from(signals)
        .orderBy(signals.fired_at)
        .limit(1);

      const hoursRunning =
        firstSignal.length > 0
          ? (Date.now() - new Date(firstSignal[0]!.fired_at).getTime()) /
            (1000 * 60 * 60)
          : 0;

      // Performance by instrument
      const performanceByInstrument: Record<string, any> = {};
      const byInstrument = signalsWithOutcome.reduce(
        (acc, s) => {
          const key = s.signal.instrument;
          if (!acc[key]) acc[key] = { count: 0, wins: 0, losses: 0 };
          acc[key].count++;
          if (s.outcome?.outcome === "WIN") acc[key].wins++;
          else if (s.outcome?.outcome === "LOSS") acc[key].losses++;
          return acc;
        },
        {} as Record<string, any>,
      );

      Object.entries(byInstrument).forEach(([key, data]) => {
        performanceByInstrument[key] = {
          ...data,
          winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
        };
      });

      // Performance by timeframe
      const performanceByTimeframe: Record<string, any> = {};
      const byTimeframe = signalsWithOutcome.reduce(
        (acc, s) => {
          const key = s.signal.timeframe;
          if (!acc[key]) acc[key] = { count: 0, wins: 0, losses: 0 };
          acc[key].count++;
          if (s.outcome?.outcome === "WIN") acc[key].wins++;
          else if (s.outcome?.outcome === "LOSS") acc[key].losses++;
          return acc;
        },
        {} as Record<string, any>,
      );

      Object.entries(byTimeframe).forEach(([key, data]) => {
        performanceByTimeframe[key] = {
          ...data,
          winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
        };
      });

      // Performance by quality tag
      const performanceByQuality: Record<string, any> = {};
      const byQuality = signalsWithOutcome.reduce(
        (acc, s) => {
          const key = s.signal.quality_tag || "untagged";
          if (!acc[key]) acc[key] = { count: 0, wins: 0, losses: 0 };
          acc[key].count++;
          if (s.outcome?.outcome === "WIN") acc[key].wins++;
          else if (s.outcome?.outcome === "LOSS") acc[key].losses++;
          return acc;
        },
        {} as Record<string, any>,
      );

      Object.entries(byQuality).forEach(([key, data]) => {
        performanceByQuality[key] = {
          ...data,
          winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
        };
      });

      // Find best performing pair and timeframe
      let bestPair: string | null = null;
      let bestPairWinRate = 0;
      Object.entries(performanceByInstrument).forEach(([pair, stats]) => {
        if (stats.winRate > bestPairWinRate && stats.count >= 3) {
          bestPair = pair;
          bestPairWinRate = stats.winRate;
        }
      });

      let bestTimeframe: string | null = null;
      let bestTimeframeWinRate = 0;
      Object.entries(performanceByTimeframe).forEach(([tf, stats]) => {
        if (stats.winRate > bestTimeframeWinRate && stats.count >= 3) {
          bestTimeframe = tf;
          bestTimeframeWinRate = stats.winRate;
        }
      });

      const metrics = {
        totalSignals,
        activeCount,
        closedCount,
        accuracyRate,
        winRate,
        averageRR,
        netPnL,
        wins,
        losses,
        tp1Hits,
        tp2Hits,
        tp3Hits,
        slHits,
        tp1Accuracy,
        hoursRunning,
        bestPair,
        bestPairWinRate,
        bestTimeframe,
        bestTimeframeWinRate,
        performanceByInstrument,
        performanceByTimeframe,
        performanceByQuality,
      };

      return reply.send({
        metrics,
        activeSignals,
        closedSignals: closedSignals.map((s) => ({
          ...s.signal,
          outcome: s.outcome,
        })),
      });
    } catch (error) {
      console.error("[PaperTrading] Error calculating metrics:", error);
      return reply.status(500).send({
        error: "Failed to calculate paper trading metrics",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}
