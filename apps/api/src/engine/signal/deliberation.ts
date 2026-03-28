import { groqChat } from "./groq-client.js";
import type { Direction, Regime } from "@apex/types";
import type { IndicatorResult } from "../indicators/indicator-engine.js";
import type { ExpertOutput } from "../experts/types.js";

type DeliberationInput = {
  instrument: string;
  timeframe: string;
  regime: Regime;
  direction: Direction;
  confidence: number;
  indicators: IndicatorResult;
  expertVotes: Record<string, ExpertOutput>;
  rrRatio: number;
  hasOpenCorrelatedSignal: boolean;
  consecutiveLosses: number;
};

type DeliberationResult = {
  approved: boolean;
  adjustedConfidence: number;
  sizeMultiplier: number;
  warnings: string[];
  bullThesis: string;
  bearThesis: string;
};

const BULL_SYSTEM = `You are a bullish market researcher. Given market data, construct the strongest possible bullish case in 1-2 sentences. Be specific about indicators and price levels. No disclaimers.`;

const BEAR_SYSTEM = `You are a bearish market researcher. Given market data, construct the strongest possible bearish case and key risks in 1-2 sentences. Be specific. No disclaimers.`;

async function bullResearcher(input: DeliberationInput): Promise<string> {
  const msg = `${input.instrument} ${input.timeframe} | Regime: ${input.regime} | ADX: ${input.indicators.adx.toFixed(1)} | RSI: ${input.indicators.rsi.toFixed(1)} | Hurst: ${input.indicators.hurst.toFixed(2)} | EMA20: ${input.indicators.ema20.toFixed(5)} vs EMA50: ${input.indicators.ema50.toFixed(5)}`;
  try {
    return await groqChat(BULL_SYSTEM, msg);
  } catch {
    return `${input.instrument} showing bullish structure with ADX ${input.indicators.adx.toFixed(1)} and RSI ${input.indicators.rsi.toFixed(1)}.`;
  }
}

async function bearResearcher(input: DeliberationInput): Promise<string> {
  const msg = `${input.instrument} ${input.timeframe} | Regime: ${input.regime} | ADX: ${input.indicators.adx.toFixed(1)} | RSI: ${input.indicators.rsi.toFixed(1)} | ATR ratio: ${input.indicators.atrRatio.toFixed(2)} | BB bandwidth: ${input.indicators.bbBandwidth.toFixed(4)}`;
  try {
    return await groqChat(BEAR_SYSTEM, msg);
  } catch {
    return `${input.instrument} faces resistance with ATR ratio ${input.indicators.atrRatio.toFixed(2)} suggesting elevated volatility risk.`;
  }
}

function riskManager(input: DeliberationInput): {
  approved: boolean;
  adjustedConfidence: number;
  sizeMultiplier: number;
  warnings: string[];
} {
  let adjustedConfidence = input.confidence;
  let sizeMultiplier = 1.0;
  const warnings: string[] = [];

  // Correlated signal exposure
  if (input.hasOpenCorrelatedSignal) {
    adjustedConfidence -= 5;
    sizeMultiplier *= 0.75;
    warnings.push("correlated signal already active");
  }

  // Consecutive losses penalty
  if (input.consecutiveLosses >= 3) {
    adjustedConfidence -= 10;
    sizeMultiplier *= 0.5;
    warnings.push(`${input.consecutiveLosses} consecutive losses on this pair`);
  }

  // R:R gate
  if (input.rrRatio < 1.5) {
    return { approved: false, adjustedConfidence, sizeMultiplier, warnings: [...warnings, "R:R below 1.5 minimum"] };
  }

  // Extreme volatility size reduction
  if (input.indicators.atrRatio > 1.8) {
    sizeMultiplier *= 0.5;
    warnings.push("extreme volatility — size reduced 50%");
  } else if (input.indicators.atrRatio > 1.3) {
    sizeMultiplier *= 0.8;
    warnings.push("elevated volatility — size reduced 20%");
  }

  // Confidence gate
  if (adjustedConfidence < 60) {
    return { approved: false, adjustedConfidence, sizeMultiplier, warnings: [...warnings, "confidence below 60 threshold"] };
  }

  return { approved: true, adjustedConfidence: Math.round(adjustedConfidence), sizeMultiplier, warnings };
}

export async function runDeliberation(input: DeliberationInput): Promise<DeliberationResult> {
  const [bullThesis, bearThesis] = await Promise.all([
    bullResearcher(input),
    bearResearcher(input),
  ]);

  const riskDecision = riskManager(input);

  return {
    ...riskDecision,
    bullThesis,
    bearThesis,
  };
}
