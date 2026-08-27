/**
 * Strategy 2: Multi-Timeframe Confluence (Breaker Block / Order Block)
 *
 * Core concept:
 *   Never mark structure on M30/M15 — go to D1/H4 first for the real picture.
 *   Then drop to H1 to find WHAT price reacted from (breaker block or order block).
 *   Use M30 only for entry timing after the HTF POI is identified.
 *   The "first trader's stop loss" on M30 is the real TP target because it sits
 *   at HTF liquidity that the market is engineered to reach.
 *
 * BUY setup:
 *   1. D1 bullish structure   : HH + HL on D1 (mandatory — primary bias)
 *   2. H4 confirms D1         : H4 also showing bullish structure (mandatory)
 *   3. H1 POI identification  : find the most recent H1 breaker block or order block
 *                               in the bullish direction — this is where institutions reacted
 *                               Inside the POI, look for a prior liquidity sweep
 *   4. M30 inducement check   : identify if recent M30 lows are inducements
 *                               (price failed to take out previous high = that low is bait)
 *                               Do NOT confuse inducement lows for real targets
 *   5. M30 entry trigger      : price has returned to the H1 POI zone
 *                               current M30 bar is inside the POI
 *   6. SL                     : below the POI low with small buffer (buy)
 *   7. TP                     : the inducement level (M30 "first trader's TP")
 *                               — which is actually HTF liquidity above
 *                               minimum 1.5 R:R required
 *
 * SELL: mirror of above (D1/H4 bearish, H1 bearish OB/breaker, M30 inducement high)
 */

import type { OHLCV } from "../indicators/indicator-engine.js";
import { classifyHtfStructure } from "./htf-fvg-strategy.js";

// ── Configuration ─────────────────────────────────────────────────────────────

// Swing detection window (bars either side)
const SWING_WINDOW = 2;

// How many H1 bars back to look for the POI (breaker/OB)
// 30 bars = ~30 hours — only the most recent H1 structure matters
const H1_POI_LOOKBACK = 30;

// How many M30 bars back to search for inducement
// 15 bars = ~7.5 hours — recent M30 action only
const M30_INDUCEMENT_LOOKBACK = 15;

// How many M30 bars back to check for POI mitigation (entry window)
const M30_ENTRY_LOOKBACK = 6;

// Minimum POI height as % of price
const MIN_POI_SIZE_PCT = 0.0005; // 0.05%

// ── Types ─────────────────────────────────────────────────────────────────────

export type HtfBias = "bullish" | "bearish" | "none";

export type PointOfInterest = {
  top:       number;
  bottom:    number;
  midpoint:  number;
  type:      "breaker_block" | "order_block";
  hadSweep:  boolean; // was there a liquidity sweep inside/before this POI?
};

export type InducementLevel = {
  price:    number;
  type:     "failed_high" | "failed_low"; // failed_high = bearish inducement, failed_low = bullish
  barIdx:   number;
};

export type MultiTfResult =
  | { valid: false; reason: string }
  | {
      valid:         true;
      direction:     "buy" | "sell";
      entryPrice:    number;
      slPrice:       number;
      tpPrice:       number;
      slDistance:    number;
      rrRatio:       number;
      d1Bias:        HtfBias;
      h4Bias:        HtfBias;
      poi:           PointOfInterest;
      inducement:    InducementLevel;
      reason:        string;
    };

// ── Swing detection ───────────────────────────────────────────────────────────

type SwingPoint = { price: number; index: number; type: "high" | "low" };

function detectSwings(bars: OHLCV[], window = SWING_WINDOW): SwingPoint[] {
  const result: SwingPoint[] = [];
  for (let i = window; i < bars.length - window; i++) {
    const slice = bars.slice(i - window, i + window + 1);
    const maxH = Math.max(...slice.map((b) => b.high));
    const minL = Math.min(...slice.map((b) => b.low));
    if (bars[i]!.high === maxH) result.push({ price: bars[i]!.high, index: i, type: "high" });
    if (bars[i]!.low  === minL) result.push({ price: bars[i]!.low,  index: i, type: "low"  });
  }
  return result;
}

// ── Order Block detection on H1 ───────────────────────────────────────────────
// Bullish OB: the last bearish (down) candle before a strong bullish impulse move
// Bearish OB: the last bullish (up) candle before a strong bearish impulse move

function detectOrderBlock(
  bars:      OHLCV[],
  direction: "bull" | "bear",
  currentPrice: number,
): PointOfInterest | null {
  const minSize = currentPrice * MIN_POI_SIZE_PCT;
  const lookback = Math.min(H1_POI_LOOKBACK, bars.length - 4);
  const search = bars.slice(-lookback - 1, -1); // exclude current bar

  if (direction === "bull") {
    // Find the last down-close candle before a multi-bar bullish move
    for (let i = search.length - 3; i >= 1; i--) {
      const c  = search[i]!;
      const c1 = search[i + 1]!;
      const c2 = search[i + 2] ?? c1;

      const isDownCandle = c.close < c.open;
      const nextBullish  = c1.close > c.high && c2.close > c.high;
      const obSize       = c.open - c.close; // body size

      if (isDownCandle && nextBullish && obSize >= minSize) {
        // Check if there was a liquidity sweep before this OB formed
        const priorBars  = search.slice(0, i);
        const priorSwings = detectSwings(priorBars, SWING_WINDOW);
        const priorLows   = priorSwings.filter((s) => s.type === "low");
        const hadSweep    = priorLows.some((s) =>
          search[i]!.low < s.price && search[i]!.close > s.price,
        );

        return {
          top:       c.open,
          bottom:    c.close,
          midpoint:  (c.open + c.close) / 2,
          type:      "order_block",
          hadSweep,
        };
      }
    }
  } else {
    // Find the last up-close candle before a multi-bar bearish move
    for (let i = search.length - 3; i >= 1; i--) {
      const c  = search[i]!;
      const c1 = search[i + 1]!;
      const c2 = search[i + 2] ?? c1;

      const isUpCandle  = c.close > c.open;
      const nextBearish = c1.close < c.low && c2.close < c.low;
      const obSize      = c.close - c.open;

      if (isUpCandle && nextBearish && obSize >= minSize) {
        const priorBars   = search.slice(0, i);
        const priorSwings = detectSwings(priorBars, SWING_WINDOW);
        const priorHighs  = priorSwings.filter((s) => s.type === "high");
        const hadSweep    = priorHighs.some((s) =>
          search[i]!.high > s.price && search[i]!.close < s.price,
        );

        return {
          top:       c.close,
          bottom:    c.open,
          midpoint:  (c.close + c.open) / 2,
          type:      "order_block",
          hadSweep,
        };
      }
    }
  }

  return null;
}

// ── Breaker Block detection on H1 ────────────────────────────────────────────
// A breaker block is a prior swing that was broken (market structure shift),
// then price returns to it — the broken resistance becomes support (and vice versa)

function detectBreakerBlock(
  bars:      OHLCV[],
  direction: "bull" | "bear",
  currentPrice: number,
): PointOfInterest | null {
  const minSize = currentPrice * MIN_POI_SIZE_PCT;
  const lookback = Math.min(H1_POI_LOOKBACK, bars.length - 4);
  const search = bars.slice(-lookback - 1, -1);

  const swings = detectSwings(search, SWING_WINDOW);

  if (direction === "bull") {
    // Bullish breaker: a prior bearish swing high that got broken to the upside
    // When price returns to it → it acts as support
    const bearHighs = swings.filter((s) => s.type === "high").slice(-6);

    for (let i = bearHighs.length - 1; i >= 1; i--) {
      const prevHigh = bearHighs[i - 1]!;
      const thisHigh = bearHighs[i]!;

      // This high was broken if a later candle's close exceeded it
      const barsAfter = search.slice(thisHigh.index + 1);
      const wasBroken = barsAfter.some((b) => b.close > thisHigh.price);

      if (wasBroken) {
        const blockSize = thisHigh.price - (search[thisHigh.index]!.low ?? thisHigh.price * 0.999);
        if (blockSize >= minSize) {
          // Check for sweep inside the breaker
          const hadSweep = barsAfter.some(
            (b) => b.low < search[thisHigh.index]!.low! && b.close > search[thisHigh.index]!.low!,
          );

          return {
            top:       thisHigh.price,
            bottom:    search[thisHigh.index]!.low ?? thisHigh.price * 0.9995,
            midpoint:  (thisHigh.price + (search[thisHigh.index]!.low ?? thisHigh.price * 0.999)) / 2,
            type:      "breaker_block",
            hadSweep,
          };
        }
      }
    }
  } else {
    // Bearish breaker: a prior bullish swing low that got broken to the downside
    const bullLows = swings.filter((s) => s.type === "low").slice(-6);

    for (let i = bullLows.length - 1; i >= 1; i--) {
      const thisLow = bullLows[i]!;
      const barsAfter = search.slice(thisLow.index + 1);
      const wasBroken = barsAfter.some((b) => b.close < thisLow.price);

      if (wasBroken) {
        const blockSize = (search[thisLow.index]!.high ?? thisLow.price * 1.001) - thisLow.price;
        if (blockSize >= minSize) {
          const hadSweep = barsAfter.some(
            (b) => b.high > search[thisLow.index]!.high! && b.close < search[thisLow.index]!.high!,
          );

          return {
            top:       search[thisLow.index]!.high ?? thisLow.price * 1.0005,
            bottom:    thisLow.price,
            midpoint:  ((search[thisLow.index]!.high ?? thisLow.price * 1.001) + thisLow.price) / 2,
            type:      "breaker_block",
            hadSweep,
          };
        }
      }
    }
  }

  return null;
}

// ── Inducement detection on M30 ───────────────────────────────────────────────
// An inducement is a swing that FAILED to extend — price did not take out
// the previous high (bullish context) or previous low (bearish context).
// This looks like a real target to the first trader but is actually bait.
//
// Bullish context: price failed to make a new high → that HIGH is the inducement
//   → first trader shorts there → we use it as TP (their SL = our TP)
// Bearish context: price failed to make a new low → that LOW is the inducement

function detectInducement(
  bars:      OHLCV[],
  direction: "bull" | "bear",
): InducementLevel | null {
  const lookback = Math.min(M30_INDUCEMENT_LOOKBACK, bars.length - 4);
  const search = bars.slice(-lookback - 1, -1);
  const swings = detectSwings(search, SWING_WINDOW);

  if (direction === "bull") {
    // In a bullish context, find a failed high
    // A failed high: a swing high that is LOWER than the previous swing high
    // (market tried to go higher but failed — inducement for shorts)
    const highs = swings.filter((s) => s.type === "high").slice(-4);
    for (let i = highs.length - 1; i >= 1; i--) {
      const curr = highs[i]!;
      const prev = highs[i - 1]!;
      if (curr.price < prev.price) {
        // Failed to take out previous high — this high is the inducement for shorts
        // We (second traders) use it as TP going long
        return {
          price:  curr.price,
          type:   "failed_high",
          barIdx: curr.index,
        };
      }
    }
    // Fallback: use the most recent swing high above current price
    const recentHighs = swings
      .filter((s) => s.type === "high")
      .sort((a, b) => b.index - a.index);
    if (recentHighs.length > 0) {
      return { price: recentHighs[0]!.price, type: "failed_high", barIdx: recentHighs[0]!.index };
    }
  } else {
    // Bearish context: find a failed low
    const lows = swings.filter((s) => s.type === "low").slice(-4);
    for (let i = lows.length - 1; i >= 1; i--) {
      const curr = lows[i]!;
      const prev = lows[i - 1]!;
      if (curr.price > prev.price) {
        // Failed to take out previous low — inducement for longs
        // We use it as TP going short
        return {
          price:  curr.price,
          type:   "failed_low",
          barIdx: curr.index,
        };
      }
    }
    const recentLows = swings
      .filter((s) => s.type === "low")
      .sort((a, b) => b.index - a.index);
    if (recentLows.length > 0) {
      return { price: recentLows[0]!.price, type: "failed_low", barIdx: recentLows[0]!.index };
    }
  }

  return null;
}

// ── M30 POI mitigation check ──────────────────────────────────────────────────
// Check if the current M30 bar has returned into the H1 POI zone

function isPriceMitigatingPoi(
  m30Bars:    OHLCV[],
  poi:        PointOfInterest,
  direction:  "bull" | "bear",
): boolean {
  // Look at the most recent M30 bars
  const recent = m30Bars.slice(-M30_ENTRY_LOOKBACK);
  const currentPrice = m30Bars[m30Bars.length - 1]!.close;

  // Price must currently be inside or have wicked into the POI
  const insidePoi = currentPrice >= poi.bottom && currentPrice <= poi.top;

  if (insidePoi) return true;

  // Also check if any recent bar wicked into the POI and closed back out
  // (aggressive entry on the wick)
  for (const bar of recent) {
    if (direction === "bull") {
      // Bar wicked into POI from below and closed above POI bottom
      if (bar.low <= poi.top && bar.low >= poi.bottom && bar.close > poi.bottom) {
        return true;
      }
    } else {
      // Bar wicked into POI from above and closed below POI top
      if (bar.high >= poi.bottom && bar.high <= poi.top && bar.close < poi.top) {
        return true;
      }
    }
  }

  return false;
}

// ── Main evaluation ───────────────────────────────────────────────────────────

export function evaluateMultiTfStrategy(
  m30Bars: OHLCV[],
  h1Bars:  OHLCV[],
  h4Bars:  OHLCV[],
  d1Bars:  OHLCV[],
): MultiTfResult {
  if (m30Bars.length < 30) return { valid: false, reason: "insufficient M30 bars" };
  if (h1Bars.length  < 20) return { valid: false, reason: "insufficient H1 bars" };
  if (h4Bars.length  < 10) return { valid: false, reason: "insufficient H4 bars" };

  const currentPrice = m30Bars[m30Bars.length - 1]!.close;

  // ── Step 1: D1 structure — primary bias ─────────────────────────────────
  const d1Bias = d1Bars.length >= 6 ? classifyHtfStructure(d1Bars) : "none";

  // If D1 data is insufficient, fall back to H4 as primary
  const primaryBias = d1Bias !== "none" ? d1Bias : classifyHtfStructure(h4Bars);
  if (primaryBias === "none") {
    return { valid: false, reason: "D1/H4 structure unclear — no clear HH/HL or LL/LH" };
  }

  // ── Step 2: H4 must confirm D1 ──────────────────────────────────────────
  const h4Bias = classifyHtfStructure(h4Bars);
  if (h4Bias !== primaryBias) {
    return {
      valid:  false,
      reason: `H4 (${h4Bias}) does not confirm D1 (${primaryBias}) — no confluence`,
    };
  }

  const isBull    = primaryBias === "bullish";
  const direction = isBull ? "buy" : "sell";
  const poiDir    = isBull ? "bull" : "bear";

  // ── Step 3: H1 POI — breaker block or order block ────────────────────────
  // Try breaker block first (stronger signal), fall back to order block
  const breakerBlock = detectBreakerBlock(h1Bars, poiDir, currentPrice);
  const orderBlock   = detectOrderBlock(h1Bars, poiDir, currentPrice);

  // Prefer breaker block with a sweep (highest quality), then breaker, then OB with sweep, then OB
  const poi =
    (breakerBlock?.hadSweep ? breakerBlock : null) ??
    breakerBlock ??
    (orderBlock?.hadSweep ? orderBlock : null) ??
    orderBlock;

  if (!poi) {
    return {
      valid:  false,
      reason: `no H1 ${isBull ? "bullish" : "bearish"} breaker block or order block found`,
    };
  }

  // ── Step 4: M30 inducement check ─────────────────────────────────────────
  const inducement = detectInducement(m30Bars, poiDir);
  if (!inducement) {
    return { valid: false, reason: "no M30 inducement level identified" };
  }

  // Validate inducement is in the right direction
  if (isBull && inducement.price <= currentPrice) {
    return { valid: false, reason: "M30 inducement level is below current price for buy" };
  }
  if (!isBull && inducement.price >= currentPrice) {
    return { valid: false, reason: "M30 inducement level is above current price for sell" };
  }

  // ── Step 5: M30 entry — price must be in POI ─────────────────────────────
  const inPoi = isPriceMitigatingPoi(m30Bars, poi, poiDir);
  if (!inPoi) {
    return {
      valid:  false,
      reason: `M30 price ${currentPrice.toFixed(5)} not yet in H1 POI [${poi.bottom.toFixed(5)}–${poi.top.toFixed(5)}]`,
    };
  }

  // ── Step 6: SL below POI (buy) / above POI (sell) ─────────────────────────
  const slBuffer = currentPrice * 0.0005;
  const slPrice  = isBull
    ? poi.bottom - slBuffer
    : poi.top    + slBuffer;

  const slDistance = Math.abs(currentPrice - slPrice);
  if (slDistance < currentPrice * 0.0002) {
    return { valid: false, reason: "SL too tight — entry too close to POI boundary" };
  }

  // ── Step 7: TP at the inducement level ────────────────────────────────────
  const tpPrice    = inducement.price;
  const tpDistance = Math.abs(tpPrice - currentPrice);
  const rrRatio    = Math.round((tpDistance / slDistance) * 100) / 100;

  if (rrRatio < 1.5) {
    return { valid: false, reason: `R:R ${rrRatio} below minimum 1.5` };
  }

  return {
    valid:      true,
    direction,
    entryPrice: currentPrice,
    slPrice,
    tpPrice,
    slDistance,
    rrRatio,
    d1Bias:     primaryBias,
    h4Bias,
    poi,
    inducement,
    reason: [
      `D1 ${primaryBias} + H4 confirms`,
      `H1 ${poi.type}${poi.hadSweep ? " + sweep" : ""} [${poi.bottom.toFixed(5)}–${poi.top.toFixed(5)}]`,
      `M30 inducement at ${tpPrice.toFixed(5)} (${inducement.type})`,
      `entry ${currentPrice.toFixed(5)} | SL ${slPrice.toFixed(5)} | TP ${tpPrice.toFixed(5)} | R:R ${rrRatio}`,
    ].join(" | "),
  };
}
