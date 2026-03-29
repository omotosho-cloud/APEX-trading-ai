import type { Regime } from "@apex/types";

export const BASE_WEIGHTS = {
  technical:   0.35,
  smart_money: 0.20,
  sentiment:   0.15,
  macro:       0.15,
  quant:       0.15,
};

// Mirrors gating-network.ts adjustments — no Redis, no bench rule (deterministic)
export function getRegimeWeights(
  regime: Regime,
  timeframe: string,
  instrument: string,
): Partial<typeof BASE_WEIGHTS> {
  const adj: Partial<typeof BASE_WEIGHTS> = {};

  if (regime === "trending_bull" || regime === "trending_bear") {
    adj.technical   = +0.10;
    adj.macro       = +0.05;
    adj.sentiment   = -0.05;
    adj.smart_money = -0.10;
  }
  if (regime === "ranging") {
    adj.technical   = +0.10;
    adj.smart_money = +0.05;
    adj.macro       = -0.10;
  }
  if (regime === "volatile") {
    adj.macro       = +0.15;
    adj.sentiment   = +0.10;
    adj.technical   = -0.15;
    adj.smart_money = -0.10;
  }
  if (["M5","M15"].includes(timeframe)) {
    adj.macro      = (adj.macro      ?? 0) - 0.10;
    adj.technical  = (adj.technical  ?? 0) + 0.10;
  }
  if (["D1","W1"].includes(timeframe)) {
    adj.macro  = (adj.macro  ?? 0) + 0.10;
    adj.quant  = (adj.quant  ?? 0) + 0.05;
  }
  if (["BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT","XRPUSDT"].includes(instrument)) {
    adj.sentiment   = (adj.sentiment   ?? 0) + 0.10;
    adj.macro       = (adj.macro       ?? 0) - 0.05;
    adj.smart_money = (adj.smart_money ?? 0) - 0.05;
  }

  return adj;
}
