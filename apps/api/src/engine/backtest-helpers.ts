import { isForexInstrument, isMajorPair, isSyntheticInstrument } from "./market-data/instruments.js";

type Regime = "trending_bull" | "trending_bear" | "ranging" | "breakout_imminent" | "volatile" | "choppy";

export const BASE_WEIGHTS = {
  htf_fvg:      0.30,
  multi_tf:     0.30,
  pullback_poi: 0.25,
  technical:    0.08,
  macro:        0.04,
  quant:        0.03,
};

export function getRegimeWeights(
  regime:     Regime,
  timeframe:  string,
  instrument: string,
): Partial<typeof BASE_WEIGHTS> {
  const adj: Partial<typeof BASE_WEIGHTS> = {};

  if (regime === "trending_bull" || regime === "trending_bear") {
    adj.htf_fvg      = (adj.htf_fvg      ?? 0) + 0.03;
    adj.multi_tf     = (adj.multi_tf     ?? 0) + 0.02;
    adj.pullback_poi = (adj.pullback_poi ?? 0) + 0.02;
    adj.technical    = (adj.technical    ?? 0) + 0.02;
    adj.macro        = (adj.macro        ?? 0) - 0.03;
    adj.quant        = (adj.quant        ?? 0) - 0.06;
  }
  if (regime === "ranging") {
    adj.pullback_poi = (adj.pullback_poi ?? 0) + 0.03;
    adj.htf_fvg      = (adj.htf_fvg      ?? 0) - 0.02;
    adj.macro        = (adj.macro        ?? 0) - 0.01;
  }
  if (regime === "volatile") {
    adj.macro        = (adj.macro        ?? 0) + 0.05;
    adj.htf_fvg      = (adj.htf_fvg      ?? 0) - 0.03;
    adj.multi_tf     = (adj.multi_tf     ?? 0) - 0.02;
  }
  if (["M5", "M15"].includes(timeframe)) {
    adj.htf_fvg      = (adj.htf_fvg      ?? 0) + 0.03;
    adj.pullback_poi = (adj.pullback_poi ?? 0) + 0.02;
    adj.macro        = (adj.macro        ?? 0) - 0.05;
  }
  if (["H4", "D1", "W1"].includes(timeframe)) {
    adj.macro        = (adj.macro        ?? 0) + 0.05;
    adj.quant        = (adj.quant        ?? 0) + 0.03;
    adj.htf_fvg      = (adj.htf_fvg      ?? 0) - 0.03;
  }
  if (isForexInstrument(instrument) && isMajorPair(instrument)) {
    adj.macro        = (adj.macro        ?? 0) + 0.03;
    adj.htf_fvg      = (adj.htf_fvg      ?? 0) + 0.01;
    adj.multi_tf     = (adj.multi_tf     ?? 0) + 0.01;
    adj.pullback_poi = (adj.pullback_poi ?? 0) + 0.01;
    adj.quant        = (adj.quant        ?? 0) - 0.06;
  }
  if (isForexInstrument(instrument) && !isMajorPair(instrument)) {
    adj.htf_fvg      = (adj.htf_fvg      ?? 0) + 0.02;
    adj.multi_tf     = (adj.multi_tf     ?? 0) + 0.02;
    adj.pullback_poi = (adj.pullback_poi ?? 0) + 0.02;
    adj.technical    = (adj.technical    ?? 0) + 0.02;
    adj.macro        = (adj.macro        ?? 0) - 0.04;
    adj.quant        = (adj.quant        ?? 0) - 0.04;
  }
  if (isSyntheticInstrument(instrument)) {
    adj.htf_fvg      = (adj.htf_fvg      ?? 0) + 0.05;
    adj.multi_tf     = (adj.multi_tf     ?? 0) + 0.03;
    adj.pullback_poi = (adj.pullback_poi ?? 0) + 0.02;
    adj.macro        = (adj.macro        ?? 0) - 0.05;
    adj.quant        = (adj.quant        ?? 0) - 0.05;
  }

  return adj;
}
