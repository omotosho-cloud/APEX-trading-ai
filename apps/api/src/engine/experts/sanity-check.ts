import type { IndicatorResult } from "../indicators/indicator-engine.js";
import type { Direction } from "@apex/types";
import type { SanityCheck } from "@apex/types";

export function sanityCheckExpert(
  direction: Direction,
  indicators: IndicatorResult,
): SanityCheck {
  const rsi = indicators.rsi;

  // Extreme overbought — buying here is dangerous
  if (direction === "buy" && rsi > 75) {
    return {
      divergence_warning: true,
      distribution_signal: "bearish",
      reason: `HTF RSI at ${rsi.toFixed(0)} (extreme overbought)`,
    };
  }

  // Extreme oversold — selling here is dangerous
  if (direction === "sell" && rsi < 25) {
    return {
      divergence_warning: true,
      distribution_signal: "bullish",
      reason: `HTF RSI at ${rsi.toFixed(0)} (extreme oversold)`,
    };
  }

  // MACD divergence — price making new extreme but MACD weakening
  if (direction === "buy" && indicators.macdHistogram < 0 && indicators.rsi > 65) {
    return {
      divergence_warning: true,
      distribution_signal: "bearish",
      reason: "bearish MACD divergence at elevated RSI",
    };
  }

  if (direction === "sell" && indicators.macdHistogram > 0 && indicators.rsi < 35) {
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
    return { confidence: Math.min(confidence, 50), capped: true };
  }

  return { confidence, capped: false };
}
