import { groqChat } from "./groq-client.js";
import type { Regime } from "@apex/types";
import type { IndicatorResult } from "../indicators/indicator-engine.js";

const SYSTEM_PROMPT = `You are a professional trading analyst writing signal summaries for traders.
Write exactly 2-3 sentences of plain-English analysis explaining why this signal was generated.
Be specific: mention the regime, key indicators, and what would invalidate the signal.
Never use jargon without explanation. Tone: confident, professional, concise.
Return only the narrative text — no labels, no JSON, no bullet points.`;

export async function generateNarrative(
  instrument: string,
  timeframe: string,
  direction: string,
  regime: Regime,
  indicators: IndicatorResult,
  bullThesis: string,
  bearThesis: string,
): Promise<string> {
  const context = `
Instrument: ${instrument} | Timeframe: ${timeframe} | Direction: ${direction.toUpperCase()} | Regime: ${regime}
ADX: ${indicators.adx.toFixed(1)} | Hurst: ${indicators.hurst.toFixed(2)} | RSI: ${indicators.rsi.toFixed(1)} | ATR ratio: ${indicators.atrRatio.toFixed(2)}
EMA20: ${indicators.ema20.toFixed(5)} | EMA50: ${indicators.ema50.toFixed(5)} | EMA200: ${indicators.ema200.toFixed(5)}
Bull case: ${bullThesis}
Bear case / invalidation: ${bearThesis}
`.trim();

  try {
    return await groqChat(SYSTEM_PROMPT, context);
  } catch (err) {
    console.error("[Narrative] Groq call failed:", err);
    // Fallback narrative
    return `${instrument} showing ${direction} bias in ${regime.replace("_", " ")} regime. ADX ${indicators.adx.toFixed(1)} confirms trend strength with Hurst ${indicators.hurst.toFixed(2)} indicating persistence. Signal invalidated if price closes beyond stop loss level.`;
  }
}
