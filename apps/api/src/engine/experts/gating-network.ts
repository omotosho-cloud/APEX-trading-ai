import type { Regime } from "@apex/types";
import type { ExpertName } from "./types.js";
import { cacheGet, cacheSet } from "../../redis.js";
import { isForexInstrument, isMajorPair } from "../market-data/instruments.js";

type Weights = Record<ExpertName, number>;

type ExpertPerformanceCache = {
  consecutive_losses: number;
  last_signal_time:   number;
};

// ── Base weights ──────────────────────────────────────────────────────────────
// Three ICT strategies dominate (85% combined).
// Technical, macro, and quant serve as confirmation/filter only (15% combined).
//
// Signal quality tiers (approximate):
//   All 3 strategies agree  → ~85%+ confidence → PREMIUM
//   2 strategies agree      → ~72–80%           → A+
//   1 strategy + tech/macro → ~65–70%           → A
//   1 strategy alone        → ~60–65%           → B (fires if above threshold)
const BASE_WEIGHTS: Weights = {
  htf_fvg:      0.30,  // S1: HTF Structure + Liquidity Sweep + FVG
  multi_tf:     0.30,  // S2: D1/H4 + H1 Breaker/OB + M30 Inducement entry
  pullback_poi: 0.25,  // S3: HTF trend + Unmitigated POI + LTF CHoCH confirmation
  technical:    0.08,  // RSI/MACD/ADX confirmation — catches overbought/oversold
  macro:        0.04,  // EMA200 macro trend — confirms direction on higher TF
  quant:        0.03,  // Historical win rate — improves over time as data accumulates
};

export async function getGatingWeights(
  instrument: string,
  timeframe:  string,
  regime:     Regime,
): Promise<Weights> {
  const weights: Weights = { ...BASE_WEIGHTS };

  // ── Bench Rule ────────────────────────────────────────────────────────────
  // An expert that has lost 3+ times in a row on this instrument/TF gets
  // benched (weight capped at 5%) for 12 hours
  for (const expert of Object.keys(weights) as ExpertName[]) {
    const perfKey = `expert:perf:${expert}:${instrument}:${timeframe}`;
    const perf = await cacheGet<ExpertPerformanceCache>(perfKey);
    if (perf && perf.consecutive_losses >= 3) {
      const hoursSince = (Date.now() - perf.last_signal_time) / 3_600_000;
      if (hoursSince < 12) weights[expert] = Math.min(weights[expert]!, 0.03);
    }
  }

  // ── Regime adjustments ────────────────────────────────────────────────────
  if (regime === "trending_bull" || regime === "trending_bear") {
    weights.htf_fvg     += 0.03;
    weights.multi_tf    += 0.02;
    weights.pullback_poi += 0.02;
    weights.technical   += 0.02;
    weights.macro       -= 0.03;
    weights.quant       -= 0.06;
  }
  if (regime === "ranging") {
    weights.pullback_poi += 0.03; // pullback trades work well in ranging markets
    weights.htf_fvg      -= 0.02;
    weights.macro        -= 0.01;
  }
  if (regime === "volatile") {
    weights.macro        += 0.05;  // macro context matters more in volatile markets
    weights.htf_fvg      -= 0.03;
    weights.multi_tf     -= 0.02;
  }

  // ── Timeframe adjustments ─────────────────────────────────────────────────
  if (["M5", "M15"].includes(timeframe)) {
    weights.htf_fvg     += 0.03;  // S1 is the M5 entry strategy
    weights.pullback_poi += 0.02;
    weights.macro       -= 0.05;  // macro irrelevant at M5
  }
  if (["H4", "D1", "W1"].includes(timeframe)) {
    weights.macro       += 0.05;
    weights.quant       += 0.03;
    weights.htf_fvg     -= 0.03;
  }

  // ── Forex major pair adjustments ──────────────────────────────────────────
  // DXY and central bank policy matter on USD pairs — boost macro slightly
  if (isForexInstrument(instrument) && isMajorPair(instrument)) {
    weights.macro       += 0.03;
    weights.htf_fvg     += 0.01;
    weights.multi_tf    += 0.01;
    weights.pullback_poi += 0.01;
    weights.quant       -= 0.06;
  }

  // ── Forex minor pair (cross) adjustments ──────────────────────────────────
  // Cross pairs are more technically and structure driven
  if (isForexInstrument(instrument) && !isMajorPair(instrument)) {
    weights.htf_fvg     += 0.02;
    weights.multi_tf    += 0.02;
    weights.pullback_poi += 0.02;
    weights.technical   += 0.02;
    weights.macro       -= 0.04;
    weights.quant       -= 0.04;
  }

  // ── Normalise to sum = 1.0 ────────────────────────────────────────────────
  const total = Object.values(weights).reduce((s, w) => s + Math.max(w, 0), 0);
  for (const k of Object.keys(weights) as ExpertName[]) {
    weights[k] = Math.max(weights[k]!, 0) / total;
  }

  return weights;
}

export async function updateExpertPerformance(
  expert:     ExpertName,
  instrument: string,
  timeframe:  string,
  wasCorrect: boolean,
) {
  const perfKey = `expert:perf:${expert}:${instrument}:${timeframe}`;
  const existing = await cacheGet<ExpertPerformanceCache>(perfKey) ?? {
    consecutive_losses: 0,
    last_signal_time:   Date.now(),
  };

  existing.consecutive_losses = wasCorrect ? 0 : existing.consecutive_losses + 1;
  existing.last_signal_time   = Date.now();

  await cacheSet(perfKey, existing, 86_400);
}
