import type { Regime, Session } from "@apex/types";
import { SESSION_MULTIPLIERS } from "@apex/types";

export type RegimeResult = {
  regime: Regime;
  confidence: number;
  session: Session;
  sessionMultiplier: number;
};

// ─── Hysteresis windows (candles before committing regime switch) ──────────────

const HYSTERESIS_WINDOW: Record<string, number> = {
  M5: 3, M15: 3, M30: 4, H1: 4, H4: 5, D1: 6, W1: 8,
};

// Per (instrument:timeframe) regime history for hysteresis check
const regimeHistory = new Map<string, Regime[]>();

function recordRegime(key: string, regime: Regime, window: number) {
  const history = regimeHistory.get(key) ?? [];
  history.push(regime);
  if (history.length > window * 2) history.splice(0, history.length - window * 2);
  regimeHistory.set(key, history);
}

function isRegimeStable(key: string, regime: Regime, window: number): boolean {
  const history = regimeHistory.get(key) ?? [];
  if (history.length < window) return false;
  return history.slice(-window).every((r) => r === regime);
}

// ─── Session detection ────────────────────────────────────────────────────────

export function detectSession(): Session {
  const hour = new Date().getUTCHours();
  if (hour >= 13 && hour < 17) return "london_ny_overlap";
  if (hour >= 8 && hour < 13) return "london";
  if (hour >= 17 && hour < 22) return "new_york";
  if (hour >= 0 && hour < 8) return "tokyo";
  return "closed";
}

// ─── Core classifier (exact cascade from master prompt) ──────────────────────

export function classifyRaw(
  adx: number,
  hurst: number,
  atrRatio: number,
  bbBandwidth: number,
  structureScore: number,
  efficiencyRatio: number,
  plusDI = 0,
  minusDI = 0,
): { regime: Regime; confidence: number } {
  // Priority 1: Extreme volatility
  if (atrRatio > 1.80) {
    return {
      regime: "volatile",
      confidence: Math.min(95, 60 + Math.floor((atrRatio - 1.8) * 30)),
    };
  }

  // Priority 2: Bollinger squeeze = breakout imminent
  if (bbBandwidth < 0.020 && atrRatio < 0.85 && adx < 20) {
    return {
      regime: "breakout_imminent",
      confidence: Math.min(90, 65 + Math.floor((0.020 - bbBandwidth) * 2000)),
    };
  }

  // Priority 3: Confirmed trend — require structureScore >= 7 (clear HH/HL or LL/LH, not just expanding)
  if (adx > 25 && structureScore >= 7) {
    let conf = Math.min(92, 55 + Math.floor((adx - 25) * 1.5) + (structureScore - 7) * 5);

    // Both Hurst AND efficiency required for full confidence boost
    if (hurst > 0.55 && efficiencyRatio > 0.60) conf = Math.min(95, conf + 10);
    else if (hurst > 0.55) conf = Math.min(95, conf + 4);
    else if (hurst < 0.45) conf = Math.max(45, conf - 15); // stronger penalty

    // structureScore 7-9 = bull, 1-3 = bear only — score 6 no longer reaches here
    const regime: Regime = structureScore >= 7
      ? "trending_bull"
      : structureScore <= 3
        ? "trending_bear"
        : (plusDI > minusDI ? "trending_bull" : "trending_bear");

    return { regime, confidence: conf };
  }

  // Priority 4: Confirmed range — contracting structure (score 4) or flat (score 5) with low ADX
  // Also catch adx 25-30 with weak Hurst — transitional markets that look trending but aren't
  if ((adx < 25 && hurst < 0.52 && structureScore <= 5) || (adx < 30 && hurst < 0.45 && structureScore <= 6)) {
    return {
      regime: "ranging",
      confidence: Math.min(90, 60 + Math.floor((25 - Math.min(adx, 25)) * 1.2) + (5 - Math.min(structureScore, 5)) * 3),
    };
  }

  // Default: choppy — anything that doesn't clearly fit above
  return { regime: "choppy", confidence: Math.max(30, 50 - Math.floor(adx)) };
}

// ─── Public classifier with hysteresis + session ──────────────────────────────

export function classifyRegime(
  instrument: string,
  timeframe: string,
  adx: number,
  hurst: number,
  atrRatio: number,
  bbBandwidth: number,
  structureScore: number,
  efficiencyRatio: number,
  plusDI = 0,
  minusDI = 0,
): RegimeResult {
  const key = `${instrument}:${timeframe}`;
  const window = HYSTERESIS_WINDOW[timeframe] ?? 4;
  const session = detectSession();
  const sessionMultiplier = SESSION_MULTIPLIERS[session];

  const { regime: rawRegime, confidence: rawConf } = classifyRaw(
    adx, hurst, atrRatio, bbBandwidth, structureScore, efficiencyRatio, plusDI, minusDI,
  );

  // Record for hysteresis
  recordRegime(key, rawRegime, window);

  // Apply hysteresis — only commit if regime is stable for N candles
  const stable = isRegimeStable(key, rawRegime, window);
  const regime = stable ? rawRegime : "choppy";

  // Apply session multiplier to confidence
  const confidence = Math.round(
    Math.min(100, Math.max(0, rawConf * sessionMultiplier)),
  );

  return { regime, confidence, session, sessionMultiplier };
}
