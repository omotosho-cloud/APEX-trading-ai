import axios from "axios";
import type { ExpertOutput } from "./types.js";
import type { IndicatorResult } from "../indicators/indicator-engine.js";
import { cacheGet, cacheSet } from "../../redis.js";

type FearGreedResponse = {
  data: Array<{ value: string; value_classification: string }>;
};

async function fetchFearGreedIndex(): Promise<number> {
  const cached = await cacheGet<number>("sentiment:fear_greed");
  if (cached !== null) return cached;

  try {
    const { data } = await axios.get<FearGreedResponse>(
      "https://api.alternative.me/fng/?limit=1",
      { timeout: 5_000 },
    );
    const value = parseInt(data.data[0]?.value ?? "50", 10);
    await cacheSet("sentiment:fear_greed", value, 3600); // cache 1 hour
    return value;
  } catch {
    return 50; // neutral fallback
  }
}

const CRYPTO_INSTRUMENTS = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT"];

export async function sentimentExpert(
  instrument: string,
  indicators: IndicatorResult,
): Promise<ExpertOutput> {
  const isCrypto = CRYPTO_INSTRUMENTS.includes(instrument);

  if (isCrypto) {
    const fgi = await fetchFearGreedIndex();
    // FGI: 0-24 extreme fear (buy), 25-44 fear (buy bias), 45-55 neutral,
    //      56-75 greed (sell bias), 76-100 extreme greed (sell)
    if (fgi <= 24) return { direction: "buy", confidence: 75, reasoning: `extreme fear FGI=${fgi}` };
    if (fgi <= 44) return { direction: "buy", confidence: 62, reasoning: `fear FGI=${fgi}` };
    if (fgi >= 76) return { direction: "sell", confidence: 72, reasoning: `extreme greed FGI=${fgi}` };
    if (fgi >= 56) return { direction: "sell", confidence: 60, reasoning: `greed FGI=${fgi}` };
    return { direction: "neutral", confidence: 50, reasoning: `neutral FGI=${fgi}` };
  }

  // Forex: use OBV momentum as volume-based sentiment (not RSI — that's already in technical expert)
  const obv = indicators.obv;
  const obvPositive = obv > 0;
  const rvi = indicators.rvi;

  // RVI > 60 = strong upward closes relative to range = bullish sentiment
  // RVI < 40 = strong downward closes = bearish sentiment
  if (rvi > 62 && obvPositive) return { direction: "buy", confidence: 60, reasoning: `RVI ${rvi.toFixed(0)} + positive OBV` };
  if (rvi < 38 && !obvPositive) return { direction: "sell", confidence: 60, reasoning: `RVI ${rvi.toFixed(0)} + negative OBV` };
  if (rvi > 62) return { direction: "buy", confidence: 54, reasoning: `RVI momentum ${rvi.toFixed(0)}` };
  if (rvi < 38) return { direction: "sell", confidence: 54, reasoning: `RVI weakness ${rvi.toFixed(0)}` };
  return { direction: "neutral", confidence: 50, reasoning: "neutral RVI/OBV sentiment" };
}
