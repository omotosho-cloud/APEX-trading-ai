import type { Regime } from "@apex/types";
import type { ExpertName } from "./types.js";
import { cacheGet, cacheSet } from "../../redis.js";
import { CacheKeys } from "../../redis.js";

type Weights = Record<ExpertName, number>;

type ExpertPerformanceCache = {
  consecutive_losses: number;
  last_signal_time: number;
};

const BASE_WEIGHTS: Weights = {
  technical:   0.35,
  smart_money: 0.20,
  sentiment:   0.15,
  macro:       0.15,
  quant:       0.15,
};

const CRYPTO = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT"];

export async function getGatingWeights(
  instrument: string,
  timeframe: string,
  regime: Regime,
): Promise<Weights> {
  const weights: Weights = { ...BASE_WEIGHTS };

  // ── Bench Rule ────────────────────────────────────────────────────────────
  for (const expert of Object.keys(weights) as ExpertName[]) {
    const perfKey = `expert:perf:${expert}:${instrument}:${timeframe}`;
    const perf = await cacheGet<ExpertPerformanceCache>(perfKey);
    if (perf && perf.consecutive_losses >= 3) {
      const hoursSince = (Date.now() - perf.last_signal_time) / 3_600_000;
      if (hoursSince < 12) weights[expert] = 0.2; // benched
    }
  }

  // ── Regime adjustments ────────────────────────────────────────────────────
  if (regime === "trending_bull" || regime === "trending_bear") {
    weights.technical   += 0.10;
    weights.macro       += 0.05;
    weights.sentiment   -= 0.05;
    weights.smart_money -= 0.10;
  }
  if (regime === "ranging") {
    weights.technical   += 0.10;
    weights.smart_money += 0.05;
    weights.macro       -= 0.10;
  }
  if (regime === "volatile") {
    weights.macro       += 0.15;
    weights.sentiment   += 0.10;
    weights.technical   -= 0.15;
    weights.smart_money -= 0.10;
  }

  // ── Timeframe adjustments ─────────────────────────────────────────────────
  if (["M5", "M15"].includes(timeframe)) {
    weights.macro       -= 0.10;
    weights.technical   += 0.10;
  }
  if (["D1", "W1"].includes(timeframe)) {
    weights.macro       += 0.10;
    weights.quant       += 0.05;
  }

  // ── Crypto adjustments ────────────────────────────────────────────────────
  if (CRYPTO.includes(instrument)) {
    weights.sentiment   += 0.10;
    weights.macro       -= 0.05;
    weights.smart_money -= 0.05;
  }

  // ── Normalise ─────────────────────────────────────────────────────────────
  const total = Object.values(weights).reduce((s, w) => s + Math.max(w, 0), 0);
  for (const k of Object.keys(weights) as ExpertName[]) {
    weights[k] = Math.max(weights[k]!, 0) / total;
  }

  return weights;
}

export async function updateExpertPerformance(
  expert: ExpertName,
  instrument: string,
  timeframe: string,
  wasCorrect: boolean,
) {
  const perfKey = `expert:perf:${expert}:${instrument}:${timeframe}`;
  const existing = await cacheGet<ExpertPerformanceCache>(perfKey) ?? {
    consecutive_losses: 0,
    last_signal_time: Date.now(),
  };

  existing.consecutive_losses = wasCorrect ? 0 : existing.consecutive_losses + 1;
  existing.last_signal_time = Date.now();

  await cacheSet(perfKey, existing, 86_400); // 24h TTL
}
