/**
 * Multi-TF Confluence Expert (Strategy 2)
 *
 * Confidence scaling:
 *   D1 + H4 both aligned + H1 breaker WITH sweep + inducement found → 90
 *   D1 + H4 both aligned + H1 breaker (no sweep)                   → 82
 *   D1 + H4 both aligned + H1 order block WITH sweep               → 80
 *   D1 + H4 both aligned + H1 order block (no sweep)               → 72
 *   H4 only (D1 insufficient) + any POI                            → 65
 *   R:R ≥ 3.0 adds +5 to any tier
 */

import type { ExpertOutput } from "./types.js";
import type { OHLCV } from "../indicators/indicator-engine.js";
import { evaluateMultiTfStrategy } from "../strategy/multi-tf-confluence-strategy.js";

export function multiTfExpert(
  m30Bars: OHLCV[],
  h1Bars:  OHLCV[],
  h4Bars:  OHLCV[],
  d1Bars:  OHLCV[],
): ExpertOutput {
  const result = evaluateMultiTfStrategy(m30Bars, h1Bars, h4Bars, d1Bars);

  if (!result.valid) {
    return {
      direction: "neutral",
      confidence: 40,
      reasoning:  result.reason,
    };
  }

  // Confidence based on POI quality and HTF alignment
  let confidence: number;

  const hasD1 = result.d1Bias !== "none";
  const isBreakerBlock = result.poi.type === "breaker_block";
  const hasSweep = result.poi.hadSweep;

  if (hasD1 && isBreakerBlock && hasSweep) {
    confidence = 90;
  } else if (hasD1 && isBreakerBlock) {
    confidence = 82;
  } else if (hasD1 && hasSweep) {
    confidence = 80;
  } else if (hasD1) {
    confidence = 72;
  } else {
    confidence = 65;
  }

  // Bonus for high R:R
  if (result.rrRatio >= 3.0) confidence = Math.min(95, confidence + 5);

  return {
    direction:  result.direction,
    confidence,
    reasoning:  result.reason,
  };
}
