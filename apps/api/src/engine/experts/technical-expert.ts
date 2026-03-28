import type { ExpertOutput } from "./types.js";
import type { IndicatorResult } from "../indicators/indicator-engine.js";
import type { Regime } from "@apex/types";

export function technicalExpert(
  indicators: IndicatorResult,
  regime: Regime,
  currentPrice: number,
): ExpertOutput {
  let bullScore = 0;
  let bearScore = 0;
  const reasons: string[] = [];

  // EMA alignment
  if (currentPrice > indicators.ema20 && indicators.ema20 > indicators.ema50) {
    bullScore += 20;
    reasons.push("price above EMA20>EMA50");
  } else if (currentPrice < indicators.ema20 && indicators.ema20 < indicators.ema50) {
    bearScore += 20;
    reasons.push("price below EMA20<EMA50");
  }

  // EMA200 trend filter
  if (currentPrice > indicators.ema200) { bullScore += 10; }
  else { bearScore += 10; }

  // MACD histogram direction
  if (indicators.macdHistogram > 0 && indicators.macdLine > indicators.macdSignal) {
    bullScore += 15;
    reasons.push("MACD bullish crossover");
  } else if (indicators.macdHistogram < 0 && indicators.macdLine < indicators.macdSignal) {
    bearScore += 15;
    reasons.push("MACD bearish crossover");
  }

  // RSI
  if (indicators.rsi > 55 && indicators.rsi < 75) {
    bullScore += 15;
    reasons.push(`RSI ${indicators.rsi.toFixed(0)} bullish`);
  } else if (indicators.rsi < 45 && indicators.rsi > 25) {
    bearScore += 15;
    reasons.push(`RSI ${indicators.rsi.toFixed(0)} bearish`);
  } else if (indicators.rsi >= 75) {
    bearScore += 10; // overbought
  } else if (indicators.rsi <= 25) {
    bullScore += 10; // oversold
  }

  // Stochastic
  if (indicators.stochK > indicators.stochD && indicators.stochK < 80) {
    bullScore += 10;
  } else if (indicators.stochK < indicators.stochD && indicators.stochK > 20) {
    bearScore += 10;
  }

  // ADX trend strength
  if (indicators.adx > 25) {
    if (indicators.plusDI > indicators.minusDI) { bullScore += 15; reasons.push(`ADX ${indicators.adx.toFixed(0)} +DI dominant`); }
    else { bearScore += 15; reasons.push(`ADX ${indicators.adx.toFixed(0)} -DI dominant`); }
  }

  // Bollinger Band position
  if (currentPrice > indicators.bbMiddle && currentPrice < indicators.bbUpper) {
    bullScore += 10;
  } else if (currentPrice < indicators.bbMiddle && currentPrice > indicators.bbLower) {
    bearScore += 10;
  }

  // Regime alignment bonus
  if (regime === "trending_bull") bullScore += 5;
  if (regime === "trending_bear") bearScore += 5;

  const total = bullScore + bearScore || 1;
  const rawConf = Math.max(bullScore, bearScore);
  const confidence = Math.min(95, Math.round((rawConf / total) * 100));

  if (bullScore > bearScore && confidence >= 50) {
    return { direction: "buy", confidence, reasoning: reasons.join(", ") || "technical bias bullish" };
  }
  if (bearScore > bullScore && confidence >= 50) {
    return { direction: "sell", confidence, reasoning: reasons.join(", ") || "technical bias bearish" };
  }
  return { direction: "neutral", confidence: 50, reasoning: "no clear technical bias" };
}
