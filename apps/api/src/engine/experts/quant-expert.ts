import type { ExpertOutput } from "./types.js";
import type { IndicatorResult } from "../indicators/indicator-engine.js";
import type { Regime } from "@apex/types";
import { db } from "../../db/client.js";
import { signalOutcomes, signals } from "../../db/schema/index.js";
import { and, eq, sql } from "drizzle-orm";
import { cacheGet, cacheSet } from "../../redis.js";

type HistoricalStats = {
  winRate: number;
  totalSignals: number;
  avgRR: number;
};

async function getHistoricalStats(
  instrument: string,
  timeframe: string,
  regime: Regime,
): Promise<HistoricalStats> {
  const cacheKey = `quant:stats:${instrument}:${timeframe}:${regime}`;
  const cached = await cacheGet<HistoricalStats>(cacheKey);
  if (cached) return cached;

  const result = await db
    .select({
      total: sql<number>`COUNT(*)`,
      wins: sql<number>`SUM(CASE WHEN ${signalOutcomes.outcome} IN ('tp1','tp2','tp3') THEN 1 ELSE 0 END)`,
      avgRR: sql<number>`AVG(${signalOutcomes.rr_achieved})`,
    })
    .from(signalOutcomes)
    .innerJoin(signals, eq(signalOutcomes.signal_id, signals.id))
    .where(
      and(
        eq(signals.instrument, instrument),
        eq(signals.timeframe, timeframe),
        eq(signals.regime, regime),
      ),
    );

  const row = result[0];
  const stats: HistoricalStats = {
    totalSignals: Number(row?.total ?? 0),
    winRate: row?.total ? Number(row.wins) / Number(row.total) : 0.5,
    avgRR: Number(row?.avgRR ?? 1.5),
  };

  await cacheSet(cacheKey, stats, 300);
  return stats;
}

export async function quantExpert(
  instrument: string,
  timeframe: string,
  regime: Regime,
  indicators: IndicatorResult,
): Promise<ExpertOutput> {
  const stats = await getHistoricalStats(instrument, timeframe, regime);

  // Not enough data — return neutral with low confidence
  if (stats.totalSignals < 10) {
    return {
      direction: "neutral",
      confidence: 50,
      reasoning: `insufficient history (n=${stats.totalSignals})`,
    };
  }

  // Expected value = winRate * avgRR - (1 - winRate)
  const ev = stats.winRate * stats.avgRR - (1 - stats.winRate);
  const confidence = Math.min(90, Math.round(50 + ev * 20));

  // Volatility percentile — high ATR ratio = unfavorable for quant
  if (indicators.atrRatio > 1.5) {
    return {
      direction: "neutral",
      confidence: 45,
      reasoning: `high volatility (ATR ratio ${indicators.atrRatio.toFixed(2)}) reduces edge`,
    };
  }

  if (ev > 0.1 && stats.winRate > 0.45) {
    return {
      direction: "buy",
      confidence,
      reasoning: `EV=${ev.toFixed(2)}, WR=${(stats.winRate * 100).toFixed(0)}%, n=${stats.totalSignals}`,
    };
  }

  if (ev < -0.1) {
    return {
      direction: "sell",
      confidence: Math.min(90, Math.round(50 + Math.abs(ev) * 20)),
      reasoning: `negative EV=${ev.toFixed(2)}, fading`,
    };
  }

  return {
    direction: "neutral",
    confidence: 50,
    reasoning: `marginal EV=${ev.toFixed(2)}`,
  };
}
