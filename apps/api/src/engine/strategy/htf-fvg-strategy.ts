/**
 * Strategy 3: HTF Structure + Liquidity Sweep + FVG Entry
 *
 * Core concept (ICT / Smart Money):
 *   H4 defines real market structure. M5 "breaks" against H4 bias are liquidity sweeps.
 *   After a sweep, a strong impulse candle leaves an FVG. Entry when price returns to FVG.
 *
 * BUY:
 *   1. H4 bullish  : HH + HL sequence on H4 (at least 2 of last 3 swings)
 *   2. H1 optional : H1 also bullish → confidence boost (never blocks signal)
 *   3. M5 sweep    : within last SWEEP_LOOKBACK bars, a candle wicked below a recent
 *                    M5 swing low then CLOSED back above it (stop hunt)
 *   4. M5 FVG      : within SWEEP_LOOKBACK bars after the sweep, a 3-candle imbalance
 *                    formed (candle[i-2].high < candle[i].low)
 *   5. Entry       : current price is inside the FVG range
 *   6. SL          : below the FVG bottom minus a small buffer
 *   7. TP          : nearest M5 swing high ABOVE current price (internal liquidity)
 *                    must give at least 1.5 R:R
 *
 * SELL: mirror of above
 */

import type { OHLCV } from "../indicators/indicator-engine.js";

// ── Configuration ─────────────────────────────────────────────────────────────

// How many M5 bars back to search for a liquidity sweep
const SWEEP_LOOKBACK = 30;

// How many M5 bars after the sweep to look for a FVG
const FVG_AFTER_SWEEP = 20;

// Minimum FVG height as % of price
const MIN_FVG_PCT = 0.0003; // 0.03%

// Swing detection window — bars either side of a pivot
const SWING_WINDOW = 2;

// How many H4 swing points to use for structure
// Keep this small — we only want the MOST RECENT leg, not ancient history
const H4_SWING_COUNT = 4;

// ── Types ─────────────────────────────────────────────────────────────────────

export type HtfBias = "bullish" | "bearish" | "none";

export type FairValueGap = {
  top:       number;
  bottom:    number;
  midpoint:  number;
  direction: "bull" | "bear";
};

export type HtfFvgResult =
  | { valid: false; reason: string }
  | {
      valid:       true;
      direction:   "buy" | "sell";
      entryPrice:  number;
      slPrice:     number;
      tpPrice:     number;
      slDistance:  number;
      rrRatio:     number;
      h4Bias:      HtfBias;
      h1Confirms:  boolean;
      sweepLevel:  number;
      fvg:         FairValueGap;
      reason:      string;
    };

// ── Swing detection ───────────────────────────────────────────────────────────

type SwingPoint = { price: number; index: number; type: "high" | "low" };

function detectSwings(bars: OHLCV[], window = SWING_WINDOW): SwingPoint[] {
  const result: SwingPoint[] = [];
  for (let i = window; i < bars.length - window; i++) {
    const slice = bars.slice(i - window, i + window + 1);
    const maxHigh = Math.max(...slice.map((b) => b.high));
    const minLow  = Math.min(...slice.map((b) => b.low));
    if (bars[i]!.high === maxHigh) result.push({ price: bars[i]!.high, index: i, type: "high" });
    if (bars[i]!.low  === minLow)  result.push({ price: bars[i]!.low,  index: i, type: "low"  });
  }
  return result;
}

// ── H4 / H1 structure classification ─────────────────────────────────────────
// Requires at least 2 of the last 3 swing pairs to be HH+HL (bullish) or LL+LH (bearish)

export function classifyHtfStructure(bars: OHLCV[]): HtfBias {
  const swings = detectSwings(bars, SWING_WINDOW);
  const highs  = swings.filter((s) => s.type === "high").slice(-H4_SWING_COUNT);
  const lows   = swings.filter((s) => s.type === "low").slice(-H4_SWING_COUNT);

  if (highs.length < 2 || lows.length < 2) return "none";

  let bullPairs = 0, bearPairs = 0, pairs = 0;

  const count = Math.min(highs.length, lows.length) - 1;
  for (let i = 0; i < count; i++) {
    pairs++;
    const hhOk = highs[i + 1]!.price > highs[i]!.price;
    const hlOk = lows[i + 1]!.price  > lows[i]!.price;
    const llOk = lows[i + 1]!.price  < lows[i]!.price;
    const lhOk = highs[i + 1]!.price < highs[i]!.price;

    if (hhOk && hlOk) bullPairs++;
    if (llOk && lhOk) bearPairs++;
  }

  if (pairs === 0) return "none";

  // Need majority (at least 50%) to call a bias
  if (bullPairs > bearPairs && bullPairs >= Math.ceil(pairs * 0.5)) return "bullish";
  if (bearPairs > bullPairs && bearPairs >= Math.ceil(pairs * 0.5)) return "bearish";
  return "none";
}

// ── Liquidity sweep detection ─────────────────────────────────────────────────
// Searches SWEEP_LOOKBACK bars back for a candle that:
//   BUY:  wicked below a prior swing low AND closed above it (stop hunt of sell-side liq)
//   SELL: wicked above a prior swing high AND closed below it (stop hunt of buy-side liq)

type SweepResult = { found: boolean; sweepLevel: number; sweepIdx: number };

function detectSweep(bars: OHLCV[], direction: "bull" | "bear"): SweepResult {
  const lookback = Math.min(SWEEP_LOOKBACK, bars.length - 10);
  const searchBars = bars.slice(-lookback - 5, -1); // exclude current candle

  // Find swing levels in the window before the recent bars
  const structureBars = searchBars.slice(0, -5);
  const swings = detectSwings(structureBars, SWING_WINDOW);

  if (direction === "bull") {
    const swingLows = swings.filter((s) => s.type === "low");
    if (swingLows.length === 0) return { found: false, sweepLevel: 0, sweepIdx: -1 };

    // Use the most recent significant swing low
    const targetLow = swingLows[swingLows.length - 1]!.price;
    const recentBars = searchBars.slice(-10);

    for (let i = 0; i < recentBars.length; i++) {
      const bar = recentBars[i]!;
      // Wick below swing low + close back above = liquidity sweep
      if (bar.low < targetLow && bar.close > targetLow) {
        const absIdx = bars.length - 1 - (recentBars.length - 1 - i) - 1;
        return { found: true, sweepLevel: bar.low, sweepIdx: absIdx };
      }
    }
  } else {
    const swingHighs = swings.filter((s) => s.type === "high");
    if (swingHighs.length === 0) return { found: false, sweepLevel: 0, sweepIdx: -1 };

    const targetHigh = swingHighs[swingHighs.length - 1]!.price;
    const recentBars = searchBars.slice(-10);

    for (let i = 0; i < recentBars.length; i++) {
      const bar = recentBars[i]!;
      if (bar.high > targetHigh && bar.close < targetHigh) {
        const absIdx = bars.length - 1 - (recentBars.length - 1 - i) - 1;
        return { found: true, sweepLevel: bar.high, sweepIdx: absIdx };
      }
    }
  }

  return { found: false, sweepLevel: 0, sweepIdx: -1 };
}

// ── FVG detection ─────────────────────────────────────────────────────────────
// Looks for 3-candle imbalance in the bars AFTER the sweep candle.
// Bull FVG: bars[i-2].high < bars[i].low  → gap = unfilled bullish imbalance
// Bear FVG: bars[i-2].low  > bars[i].high → gap = unfilled bearish imbalance

function detectFvgAfterSweep(
  bars:      OHLCV[],
  sweepIdx:  number,
  direction: "bull" | "bear",
  currentPrice: number,
): FairValueGap | null {
  const minSize = currentPrice * MIN_FVG_PCT;

  // Search the bars from sweepIdx+1 up to current bar
  const startSearch = sweepIdx + 1;
  const endSearch   = bars.length - 1; // exclude current bar from FVG formation

  // Collect all FVGs after the sweep, pick the most recent one that's still open
  const fvgs: FairValueGap[] = [];

  for (let i = startSearch + 2; i <= endSearch && i < startSearch + FVG_AFTER_SWEEP; i++) {
    const c0 = bars[i - 2]!;
    const c2 = bars[i]!;

    if (direction === "bull") {
      const gap = c2.low - c0.high;
      if (gap >= minSize) {
        fvgs.push({
          top:       c2.low,
          bottom:    c0.high,
          midpoint:  (c2.low + c0.high) / 2,
          direction: "bull",
        });
      }
    } else {
      const gap = c0.low - c2.high;
      if (gap >= minSize) {
        fvgs.push({
          top:       c0.low,
          bottom:    c2.high,
          midpoint:  (c0.low + c2.high) / 2,
          direction: "bear",
        });
      }
    }
  }

  if (fvgs.length === 0) return null;

  // Return the most recent FVG
  return fvgs[fvgs.length - 1]!;
}

// ── TP: nearest swing high/low ABOVE/BELOW current price ─────────────────────

function findTpTarget(bars: OHLCV[], direction: "bull" | "bear", currentPrice: number): number {
  // Search last 50 bars for swing highs (buy) or swing lows (sell)
  const window = bars.slice(-50);
  const swings = detectSwings(window, SWING_WINDOW);

  if (direction === "bull") {
    // Find all swing highs ABOVE current price, pick the closest one
    const candidates = swings
      .filter((s) => s.type === "high" && s.price > currentPrice)
      .sort((a, b) => a.price - b.price); // ascending — pick closest
    if (candidates.length > 0) return candidates[0]!.price;
    // Fallback: highest high in the window
    return Math.max(...window.map((b) => b.high));
  } else {
    // Find all swing lows BELOW current price, pick the closest one
    const candidates = swings
      .filter((s) => s.type === "low" && s.price < currentPrice)
      .sort((a, b) => b.price - a.price); // descending — pick closest
    if (candidates.length > 0) return candidates[0]!.price;
    return Math.min(...window.map((b) => b.low));
  }
}

// ── Main evaluation ───────────────────────────────────────────────────────────

export function evaluateHtfFvgStrategy(
  m5Bars: OHLCV[],
  h1Bars: OHLCV[],
  h4Bars: OHLCV[],
): HtfFvgResult {
  if (m5Bars.length < 40) return { valid: false, reason: "insufficient M5 bars" };
  if (h4Bars.length < 10) return { valid: false, reason: "insufficient H4 bars" };

  const currentPrice = m5Bars[m5Bars.length - 1]!.close;

  // ── Step 1: H4 structure (mandatory) ────────────────────────────────────
  const h4Bias = classifyHtfStructure(h4Bars);
  if (h4Bias === "none") {
    return { valid: false, reason: "H4 structure unclear" };
  }

  // ── Step 2: H1 structure (optional boost) ────────────────────────────────
  const h1Bias     = h1Bars.length >= 10 ? classifyHtfStructure(h1Bars) : "none";
  const h1Confirms = h1Bias === h4Bias;

  const sweepDir: "bull" | "bear" = h4Bias === "bullish" ? "bull" : "bear";

  // ── Step 3: M5 liquidity sweep ───────────────────────────────────────────
  const sweep = detectSweep(m5Bars, sweepDir);
  if (!sweep.found) {
    return { valid: false, reason: `no liquidity sweep found in ${h4Bias} direction` };
  }

  // ── Step 4: FVG after the sweep ───────────────────────────────────────────
  const fvg = detectFvgAfterSweep(m5Bars, sweep.sweepIdx, sweepDir, currentPrice);
  if (!fvg) {
    return { valid: false, reason: "no FVG formed after liquidity sweep" };
  }

  // ── Step 5: Price must be inside the FVG right now ───────────────────────
  const inFvg = currentPrice >= fvg.bottom && currentPrice <= fvg.top;
  if (!inFvg) {
    return {
      valid:  false,
      reason: `price ${currentPrice.toFixed(2)} outside FVG [${fvg.bottom.toFixed(2)}–${fvg.top.toFixed(2)}]`,
    };
  }

  // ── Step 6: SL below FVG bottom (buy) / above FVG top (sell) ─────────────
  // Using FVG boundary as SL is tighter and more precise than the sweep low
  // which can be very far away and create terrible R:R
  const isBuy     = h4Bias === "bullish";
  const direction = isBuy ? "buy" : "sell";
  const slBuffer  = currentPrice * 0.0005; // 0.05% buffer

  const slPrice = isBuy
    ? fvg.bottom - slBuffer
    : fvg.top    + slBuffer;

  const slDistance = Math.abs(currentPrice - slPrice);
  if (slDistance < currentPrice * 0.0003) {
    return { valid: false, reason: "SL too tight — entry too close to FVG boundary" };
  }

  // ── Step 7: TP at nearest swing high/low above/below price ───────────────
  const tpPrice    = findTpTarget(m5Bars, sweepDir, currentPrice);
  const tpDistance = Math.abs(tpPrice - currentPrice);
  const rrRatio    = Math.round((tpDistance / slDistance) * 100) / 100;

  if (isBuy  && tpPrice <= currentPrice) return { valid: false, reason: "TP below entry for buy" };
  if (!isBuy && tpPrice >= currentPrice) return { valid: false, reason: "TP above entry for sell" };

  if (rrRatio < 1.5) {
    return { valid: false, reason: `R:R ${rrRatio} below 1.5 minimum` };
  }

  return {
    valid:      true,
    direction,
    entryPrice: currentPrice,
    slPrice,
    tpPrice,
    slDistance,
    rrRatio,
    h4Bias,
    h1Confirms,
    sweepLevel: sweep.sweepLevel,
    fvg,
    reason: [
      `H4 ${h4Bias}${h1Confirms ? " + H1 confirms" : ""}`,
      `sweep at ${sweep.sweepLevel.toFixed(2)}`,
      `FVG [${fvg.bottom.toFixed(2)}–${fvg.top.toFixed(2)}]`,
      `entry ${currentPrice.toFixed(2)} | SL ${slPrice.toFixed(2)} | TP ${tpPrice.toFixed(2)} | R:R ${rrRatio}`,
    ].join(" | "),
  };
}
