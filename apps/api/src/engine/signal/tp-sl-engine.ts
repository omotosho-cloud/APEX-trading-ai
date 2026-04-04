import type { Regime } from "@apex/types";
import { ENTRY_BUFFER, TYPICAL_SPREAD, PIP_VALUE_PER_LOT } from "@apex/types";

type SignalLevels = {
  entryPrice: number;
  entryBuffer: number;
  slPrice: number;
  tp1Price: number;
  tp2Price: number;
  tp3Price: number | null;
  atrValue: number;
  rrRatio: number;
  validUntil: Date;
  passes: boolean;
};

const ATR_MULTIPLIERS: Record<Regime, { sl: number; tp1: number; tp2: number; tp3: number | null }> = {
  ranging:           { sl: 1.2, tp1: 1.2, tp2: 2.4, tp3: 3.6 },
  trending_bull:     { sl: 1.5, tp1: 2.0, tp2: 3.5, tp3: 5.5 },
  trending_bear:     { sl: 1.5, tp1: 2.0, tp2: 3.5, tp3: 5.5 },
  breakout_imminent: { sl: 2.0, tp1: 2.5, tp2: 4.5, tp3: 7.0 },
  volatile:          { sl: 2.5, tp1: 1.5, tp2: 2.5, tp3: null },
  choppy:            { sl: 1.5, tp1: 2.0, tp2: 3.5, tp3: 5.5 },
};

const TF_MULTIPLIER: Record<string, number> = {
  M5: 0.15, M15: 0.28, M30: 0.42,
  H1: 0.55, H4: 1.00, D1: 1.80, W1: 3.20,
};

export function calculateSignalLevels(
  instrument: string,
  timeframe: string,
  direction: "buy" | "sell",
  currentPrice: number,
  atrH4: number,
  regime: Regime,
): SignalLevels {
  const tfMult = TF_MULTIPLIER[timeframe] ?? 1.0;
  const atr = atrH4 * tfMult;
  const mults = ATR_MULTIPLIERS[regime] ?? ATR_MULTIPLIERS.trending_bull;
  const spread = (TYPICAL_SPREAD[instrument] ?? 0.2) * 0.0001;
  const buffer = ENTRY_BUFFER[instrument] ?? 0.0005;

  const isBuy = direction === "buy";

  const entryPrice = isBuy ? currentPrice + spread : currentPrice - spread;
  const slPrice    = isBuy ? entryPrice - atr * mults.sl  : entryPrice + atr * mults.sl;
  const tp1Price   = isBuy ? entryPrice + atr * mults.tp1 : entryPrice - atr * mults.tp1;
  const tp2Price   = isBuy ? entryPrice + atr * mults.tp2 : entryPrice - atr * mults.tp2;
  const tp3Price   = mults.tp3 !== null
    ? (isBuy ? entryPrice + atr * mults.tp3 : entryPrice - atr * mults.tp3)
    : null;

  // R:R calculated from actual entry (not worst-case buffer — buffer is for expiry check only)
  const tpDist = Math.abs(tp1Price - entryPrice);
  const slDist = Math.abs(slPrice - entryPrice);
  const rrRatio = slDist > 0 ? Math.round((tpDist / slDist) * 100) / 100 : 0;

  // Hard expiry: current_time + (ATR × 2) hours, capped at 24h
  const validityHours = Math.min(24, (atr * 2) / (atr / 4));
  const validUntil = new Date(Date.now() + validityHours * 3_600_000);

  // Minimum RR at TP1 — 1.2 minimum, real edge is at TP2/TP3
  const minRR = 1.2;

  return {
    entryPrice,
    entryBuffer: buffer,
    slPrice,
    tp1Price,
    tp2Price,
    tp3Price,
    atrValue: atr,
    rrRatio,
    validUntil,
    passes: rrRatio >= minRR,
  };
}

export function calculateLotSize(
  accountSize: number,
  riskPct: number,
  slPips: number,
  instrument: string,
): number {
  const riskAmount = accountSize * (riskPct / 100);
  const pipValue = PIP_VALUE_PER_LOT[instrument] ?? 10;
  const lotSize = riskAmount / (slPips * pipValue);
  return Math.round(lotSize * 100) / 100;
}

export function getQualityTag(
  rrRatio: number,
  confidence: number,
  sanityCapped: boolean,
): string | null {
  if (sanityCapped) return "SANITY_CAP_APPLIED";
  if (confidence < 60) return "LOW_CONFIDENCE";
  if (rrRatio >= 2.5) return "PREMIUM";
  if (confidence >= 80 || rrRatio >= 2.0) return "HIGH_QUALITY";
  return null;
}
