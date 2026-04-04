import type { IndicatorResult } from "../indicators/indicator-engine.js";
import type { Direction } from "@apex/types";
import type { SanityCheck } from "@apex/types";

export function sanityCheckExpert(
  direction: Direction,
  indicators: IndicatorResult,
): SanityCheck {
  const rsi = indicators.rsi;

  // Extreme overbought — hard block on buy
  if (direction === "buy" && rsi > 78) {
    return {
      divergence_warning: true,
      distribution_signal: "bearish",
      reason: `HTF RSI at ${rsi.toFixed(0)} (extreme overbought — hard block)`,
    };
  }

  // Extreme oversold — hard block on sell
  if (direction === "sell" && rsi < 22) {
    return {
      divergence_warning: true,
      distribution_signal: "bullish",
      reason: `HTF RSI at ${rsi.toFixed(0)} (extreme oversold — hard block)`,
    };
  }

  // MACD divergence at elevated RSI — meaningful conflict
  if (direction === "buy" && indicators.macdHistogram < 0 && indicators.rsi > 62) {
    return {
      divergence_warning: true,
      distribution_signal: "bearish",
      reason: "bearish MACD divergence at elevated RSI",
    };
  }

  if (direction === "sell" && indicators.macdHistogram > 0 && indicators.rsi < 38) {
    return {
      divergence_warning: true,
      distribution_signal: "bullish",
      reason: "bullish MACD divergence at depressed RSI",
    };
  }

  return {
    divergence_warning: false,
    distribution_signal: "neutral",
    reason: "no significant divergence detected",
  };
}

export function applySanityCap(
  direction: Direction,
  confidence: number,
  sanity: SanityCheck,
): { confidence: number; capped: boolean } {
  if (!sanity.divergence_warning) return { confidence, capped: false };

  const isConflict =
    (direction === "buy" && sanity.distribution_signal === "bearish") ||
    (direction === "sell" && sanity.distribution_signal === "bullish");

  if (isConflict) {
    // Hard block — return confidence below threshold so pipeline rejects it
    return { confidence: 0, capped: true };
  }

  return { confidence, capped: false };
}
