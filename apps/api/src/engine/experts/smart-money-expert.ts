import type { ExpertOutput } from "./types.js";
import type { IndicatorResult } from "../indicators/indicator-engine.js";
import type { OHLCV } from "../indicators/indicator-engine.js";

// Killzone hours (UTC)
const KILLZONES = [
  { name: "London open",  start: 7,  end: 9  },
  { name: "NY open",      start: 12, end: 14 },
  { name: "Asian range",  start: 0,  end: 3  },
];

function isInKillzone(): { active: boolean; name: string } {
  const hour = new Date().getUTCHours();
  const kz = KILLZONES.find((k) => hour >= k.start && hour < k.end);
  return kz ? { active: true, name: kz.name } : { active: false, name: "" };
}

function detectOrderBlock(bars: OHLCV[]): { bullOB: number | null; bearOB: number | null } {
  // Last 10 bars — find last strong bearish candle before bullish move (bull OB)
  // and last strong bullish candle before bearish move (bear OB)
  let bullOB: number | null = null;
  let bearOB: number | null = null;

  for (let i = bars.length - 10; i < bars.length - 2; i++) {
    const bar = bars[i]!;
    const next = bars[i + 1]!;
    const bodySize = Math.abs(bar.close - bar.open);
    const avgBody = bars.slice(-10).reduce((s, b) => s + Math.abs(b.close - b.open), 0) / 10;

    // Bull OB: strong bearish candle followed by bullish move
    if (bar.close < bar.open && bodySize > avgBody * 1.5 && next.close > bar.high) {
      bullOB = bar.low;
    }
    // Bear OB: strong bullish candle followed by bearish move
    if (bar.close > bar.open && bodySize > avgBody * 1.5 && next.close < bar.low) {
      bearOB = bar.high;
    }
  }
  return { bullOB, bearOB };
}

function detectFVG(bars: OHLCV[]): { bullFVG: boolean; bearFVG: boolean } {
  // Fair Value Gap: gap between candle[i-2].high and candle[i].low (bull FVG)
  let bullFVG = false, bearFVG = false;
  for (let i = 2; i < bars.length; i++) {
    const prev2 = bars[i - 2]!, curr = bars[i]!;
    if (curr.low > prev2.high) bullFVG = true;   // bull FVG
    if (curr.high < prev2.low) bearFVG = true;   // bear FVG
  }
  return { bullFVG, bearFVG };
}

export function smartMoneyExpert(
  bars: OHLCV[],
  indicators: IndicatorResult,
  currentPrice: number,
  timeframe: string,
): ExpertOutput {
  // Smart money only reliable on H1+
  const htfOnly = ["H1", "H4", "D1", "W1"];
  if (!htfOnly.includes(timeframe)) {
    return { direction: "neutral", confidence: 50, reasoning: "SMC not applied below H1" };
  }

  let bullScore = 0, bearScore = 0;
  const reasons: string[] = [];

  const kz = isInKillzone();
  if (kz.active) { bullScore += 10; bearScore += 10; reasons.push(`${kz.name} killzone`); }

  const { bullOB, bearOB } = detectOrderBlock(bars);
  if (bullOB !== null && currentPrice >= bullOB * 0.999 && currentPrice <= bullOB * 1.005) {
    bullScore += 30; reasons.push(`price at bull order block ${bullOB.toFixed(5)}`);
  }
  if (bearOB !== null && currentPrice <= bearOB * 1.001 && currentPrice >= bearOB * 0.995) {
    bearScore += 30; reasons.push(`price at bear order block ${bearOB.toFixed(5)}`);
  }

  const { bullFVG, bearFVG } = detectFVG(bars.slice(-20));
  if (bullFVG) { bullScore += 15; reasons.push("bull FVG present"); }
  if (bearFVG) { bearScore += 15; reasons.push("bear FVG present"); }

  // Market structure: EMA alignment as proxy
  if (indicators.ema20 > indicators.ema50 && indicators.ema50 > indicators.ema200) {
    bullScore += 20; reasons.push("bullish market structure");
  } else if (indicators.ema20 < indicators.ema50 && indicators.ema50 < indicators.ema200) {
    bearScore += 20; reasons.push("bearish market structure");
  }

  const total = bullScore + bearScore || 1;
  const confidence = Math.min(90, Math.round((Math.max(bullScore, bearScore) / total) * 100));

  if (bullScore > bearScore && confidence >= 50) {
    return { direction: "buy", confidence, reasoning: reasons.join(", ") };
  }
  if (bearScore > bullScore && confidence >= 50) {
    return { direction: "sell", confidence, reasoning: reasons.join(", ") };
  }
  return { direction: "neutral", confidence: 50, reasoning: "no SMC confluence" };
}
