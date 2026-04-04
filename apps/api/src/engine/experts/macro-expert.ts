import type { ExpertOutput } from "./types.js";
import type { IndicatorResult } from "../indicators/indicator-engine.js";
import type { Regime } from "@apex/types";

// USD-positive pairs (DXY up = these go down)
const USD_POSITIVE = ["EURUSD", "GBPUSD", "AUDUSD", "NZDUSD", "XRPUSDT"];
// USD-negative pairs (DXY up = these go up)
const USD_NEGATIVE = ["USDJPY", "USDCHF", "USDCAD"];
// Risk-on assets (perform well in risk-on)
const RISK_ON = ["AUDUSD", "NZDUSD", "GBPUSD", "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT"];

export function macroExpert(
  instrument: string,
  timeframe: string,
  indicators: IndicatorResult,
  regime: Regime,
): ExpertOutput {
  // Macro is most relevant on higher timeframes
  const htfWeight = ["D1", "W1"].includes(timeframe) ? 1.3
    : ["H4"].includes(timeframe) ? 1.1
    : ["M5", "M15"].includes(timeframe) ? 0.7
    : 1.0;

  let bullScore = 0, bearScore = 0;
  const reasons: string[] = [];

  // Trend regime alignment
  if (regime === "trending_bull") { bullScore += 25; reasons.push("trending bull regime"); }
  if (regime === "trending_bear") { bearScore += 25; reasons.push("trending bear regime"); }
  if (regime === "ranging") { bullScore += 5; bearScore += 5; }

  // EMA200 macro trend — weight by distance from price (closer = weaker signal)
  const lastClose = indicators.ema20;
  const ema200Dist = Math.abs(lastClose - indicators.ema200) / (indicators.ema200 || 1);
  const ema200Weight = Math.min(30, Math.round(10 + ema200Dist * 2000)); // 10-30 pts based on distance
  if (lastClose > indicators.ema200) {
    bullScore += ema200Weight; reasons.push(`above EMA200 (+${ema200Weight})`);
  } else {
    bearScore += ema200Weight; reasons.push(`below EMA200 (+${ema200Weight})`);
  }

  // Hurst persistence
  if (indicators.hurst > 0.6) {
    if (bullScore > bearScore) { bullScore += 15; reasons.push(`Hurst ${indicators.hurst.toFixed(2)} persistent`); }
    else { bearScore += 15; }
  }

  // Risk-on/off classification via ATR ratio
  const isRiskOff = indicators.atrRatio > 1.3;
  if (isRiskOff && RISK_ON.includes(instrument)) {
    bearScore += 15; reasons.push("risk-off environment");
  }

  // Apply HTF weight
  bullScore *= htfWeight;
  bearScore *= htfWeight;

  const total = bullScore + bearScore || 1;
  const confidence = Math.min(88, Math.round((Math.max(bullScore, bearScore) / total) * 100));

  if (bullScore > bearScore && confidence >= 50) {
    return { direction: "buy", confidence, reasoning: reasons.join(", ") };
  }
  if (bearScore > bullScore && confidence >= 50) {
    return { direction: "sell", confidence, reasoning: reasons.join(", ") };
  }
  return { direction: "neutral", confidence: 50, reasoning: "no macro bias" };
}
