/**
 * HTF Structure + FVG Expert (Strategy 3)
 *
 * Confidence scaling:
 *   H4 bullish/bearish + H1 confirms + price in FVG  → 85
 *   H4 bullish/bearish only + price in FVG            → 72
 *   R:R ≥ 3.0 adds +5 to either tier
 */

import type { ExpertOutput } from "./types.js";
import type { OHLCV } from "../indicators/indicator-engine.js";
import { evaluateHtfFvgStrategy } from "../strategy/htf-fvg-strategy.js";

export function htfFvgExpert(
  m5Bars: OHLCV[],
  h1Bars: OHLCV[],
  h4Bars: OHLCV[],
): ExpertOutput {
  const result = evaluateHtfFvgStrategy(m5Bars, h1Bars, h4Bars);

  if (!result.valid) {
    return {
      direction: "neutral",
      confidence: 40,
      reasoning:  result.reason,
    };
  }

  // Base confidence from H4 + H1 alignment
  let confidence = result.h1Confirms ? 85 : 72;

  // Bonus for high R:R setups
  if (result.rrRatio >= 3.0) confidence = Math.min(92, confidence + 5);

  return {
    direction:  result.direction,
    confidence,
    reasoning:  result.reason,
  };
}
