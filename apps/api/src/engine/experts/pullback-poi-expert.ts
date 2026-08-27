/**
 * Pullback POI Expert (Strategy 3)
 *
 * Confidence scaling:
 *   HTF trend clear + unmitigated OB + LTF CHoCH/BOS confirmed → 88
 *   HTF trend clear + unmitigated OB + no LTF confirmation      → 74
 *   HTF trend clear + unmitigated FVG + LTF confirmed           → 82
 *   HTF trend clear + unmitigated FVG + no LTF confirmation     → 68
 *   R:R ≥ 3.0 adds +5 to any tier
 */

import type { ExpertOutput } from "./types.js";
import type { OHLCV } from "../indicators/indicator-engine.js";
import { evaluatePullbackPoiStrategy } from "../strategy/pullback-poi-strategy.js";

export function pullbackPoiExpert(
  ltfBars: OHLCV[],  // M5
  htfBars: OHLCV[],  // H1 or H4
): ExpertOutput {
  const result = evaluatePullbackPoiStrategy(ltfBars, htfBars);

  if (!result.valid) {
    return {
      direction: "neutral",
      confidence: 40,
      reasoning:  result.reason,
    };
  }

  const isOB = result.htfPoi.type === "order_block";

  let confidence: number;
  if (isOB && result.ltfConfirmed)       confidence = 88;
  else if (isOB && !result.ltfConfirmed) confidence = 74;
  else if (result.ltfConfirmed)          confidence = 82;
  else                                   confidence = 68;

  if (result.rrRatio >= 3.0) confidence = Math.min(95, confidence + 5);

  return {
    direction:  result.direction,
    confidence,
    reasoning:  result.reason,
  };
}
