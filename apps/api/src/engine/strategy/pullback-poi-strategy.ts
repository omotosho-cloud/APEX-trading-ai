/**
 * Strategy 3: Pullback Trade — Unmitigated POI + LTF Confirmation
 *
 * Core concept:
 *   The HTF (H1/H4) trend defines direction. Price pulls back against the trend.
 *   Within that pullback zone, there are unmitigated POIs (OBs/FVGs) that can
 *   reverse price back in the trend direction. The TP is always the Draw on
 *   Liquidity — the level that, if broken, would reverse the entire trend.
 *   You NEVER target beyond the DoL because price could reverse there.
 *
 * SELL pullback (in a downtrend):
 *   1. H1/H4 downtrend   : series of LL + LH confirmed by last BOS down
 *   2. Draw on Liquidity  : most recent significant low BELOW current price
 *                           (this is where the market is heading — our TP)
 *   3. Pullback zone      : current price is ABOVE the last BOS level
 *                           (price has pulled back up against the downtrend)
 *   4. Unmitigated POI    : find OBs/FVGs in the pullback zone (between current
 *                           price and the last BOS) that have NOT been mitigated
 *   5. LTF confirmation   : on M5, look for CHoCH (change of character) showing
 *                           the pullback is ending + BOS in trend direction
 *                           + an LTF unmitigated OB/FVG at entry
 *   6. SL                 : above the unmitigated POI high (for sell)
 *   7. TP                 : exactly at the Draw on Liquidity level
 *
 * BUY pullback (in an uptrend): mirror of above
 */

import type { OHLCV } from "../indicators/indicator-engine.js";
import { classifyHtfStructure } from "./htf-fvg-strategy.js";

// ── Configuration ─────────────────────────────────────────────────────────────

// Swing detection window
const SWING_WINDOW = 3;

// How many HTF bars back to scan for POIs and structure
// 30 bars on H1 = ~30 hours. Focus on the RECENT leg only — not ancient POIs
const HTF_SCAN_BARS = 30;

// How many LTF (M5) bars to scan for CHoCH + BOS
const LTF_SCAN_BARS = 30;

// Minimum POI size as % of price
const MIN_POI_PCT = 0.0003; // 0.03%

// Tolerance for "mitigated" check — if price came within this % of the POI it counts as mitigated
const MITIGATION_TOLERANCE_PCT = 0.0002;

// ── Types ─────────────────────────────────────────────────────────────────────

type SwingPoint = { price: number; index: number; type: "high" | "low" };

export type TrendBias = "bullish" | "bearish" | "none";

export type POI = {
  top:         number;
  bottom:      number;
  midpoint:    number;
  type:        "order_block" | "fvg";
  mitigated:   boolean;
};

export type PullbackPoiResult =
  | { valid: false; reason: string }
  | {
      valid:          true;
      direction:      "buy" | "sell";
      entryPrice:     number;
      slPrice:        number;
      tpPrice:        number;   // exactly at the Draw on Liquidity
      slDistance:     number;
      rrRatio:        number;
      htfBias:        TrendBias;
      drawOnLiquidity: number;
      htfPoi:         POI;      // unmitigated HTF POI being tapped
      ltfConfirmed:   boolean;  // LTF CHoCH + BOS + OB present
      reason:         string;
    };

// ── Swing detection ───────────────────────────────────────────────────────────

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

// ── Draw on Liquidity ─────────────────────────────────────────────────────────
// For downtrend: the most recent significant swing LOW below current price
// For uptrend:   the most recent significant swing HIGH above current price
// This is the level price is targeting — our hard TP

function findDrawOnLiquidity(
  bars:         OHLCV[],
  direction:    "bull" | "bear",
  currentPrice: number,
): number | null {
  const scan   = bars.slice(-HTF_SCAN_BARS);
  const swings = detectSwings(scan, SWING_WINDOW);

  if (direction === "bear") {
    // Looking for the most recent swing LOW below current price
    const lows = swings
      .filter((s) => s.type === "low" && s.price < currentPrice)
      .sort((a, b) => b.index - a.index); // most recent first
    return lows[0]?.price ?? null;
  } else {
    // Looking for the most recent swing HIGH above current price
    const highs = swings
      .filter((s) => s.type === "high" && s.price > currentPrice)
      .sort((a, b) => b.index - a.index);
    return highs[0]?.price ?? null;
  }
}

// ── Mitigation check ──────────────────────────────────────────────────────────
// A POI is mitigated if price has already returned to it and traded through it.
// For a bearish OB (top zone): mitigated if price has closed above the OB bottom since it formed.
// For a bullish OB (bottom zone): mitigated if price has closed below the OB top since it formed.

function isMitigated(
  poi:          POI,
  barsAfterPoi: OHLCV[],
  direction:    "bull" | "bear",
  tolerance:    number,
): boolean {
  for (const bar of barsAfterPoi) {
    if (direction === "bear") {
      // Bearish OB: mitigated if price entered and closed above the OB bottom
      if (bar.close >= poi.bottom - tolerance) return true;
    } else {
      // Bullish OB: mitigated if price entered and closed below the OB top
      if (bar.close <= poi.top + tolerance) return true;
    }
  }
  return false;
}

// ── HTF unmitigated POI scan ──────────────────────────────────────────────────
// Scans for all OBs and FVGs in the pullback zone (between BOS level and current price)
// Returns the most recent unmitigated one

function findUnmitigatedPoi(
  bars:         OHLCV[],
  direction:    "bull" | "bear",
  currentPrice: number,
  bosLevel:     number,
): POI | null {
  const minSize   = currentPrice * MIN_POI_PCT;
  const tolerance = currentPrice * MITIGATION_TOLERANCE_PCT;
  const scan      = bars.slice(-HTF_SCAN_BARS);
  const pois: Array<POI & { index: number }> = [];

  // ── Order Blocks ─────────────────────────────────────────────────────────
  for (let i = 2; i < scan.length - 2; i++) {
    const bar  = scan[i]!;
    const next = scan[i + 1]!;

    if (direction === "bear") {
      // Bearish OB: last bullish candle before a strong move down
      const isUpCandle = bar.close > bar.open;
      const bodySize   = bar.close - bar.open;
      const nextIsDown = next.close < bar.low;

      if (isUpCandle && nextIsDown && bodySize >= minSize) {
        const poi: POI = {
          top:       bar.close,
          bottom:    bar.open,
          midpoint:  (bar.close + bar.open) / 2,
          type:      "order_block",
          mitigated: false,
        };
        // Only include POIs in the pullback zone (above BOS for bear = above current price's recent range)
        if (poi.bottom > bosLevel && poi.top > currentPrice) {
          const barsAfter = scan.slice(i + 1);
          poi.mitigated = isMitigated(poi, barsAfter, direction, tolerance);
          if (!poi.mitigated) pois.push({ ...poi, index: i });
        }
      }
    } else {
      // Bullish OB: last bearish candle before a strong move up
      const isDownCandle = bar.close < bar.open;
      const bodySize     = bar.open - bar.close;
      const nextIsUp     = next.close > bar.high;

      if (isDownCandle && nextIsUp && bodySize >= minSize) {
        const poi: POI = {
          top:       bar.open,
          bottom:    bar.close,
          midpoint:  (bar.open + bar.close) / 2,
          type:      "order_block",
          mitigated: false,
        };
        if (poi.top < bosLevel && poi.bottom < currentPrice) {
          const barsAfter = scan.slice(i + 1);
          poi.mitigated = isMitigated(poi, barsAfter, direction, tolerance);
          if (!poi.mitigated) pois.push({ ...poi, index: i });
        }
      }
    }
  }

  // ── Fair Value Gaps ───────────────────────────────────────────────────────
  for (let i = 2; i < scan.length; i++) {
    const c0 = scan[i - 2]!;
    const c2 = scan[i]!;

    if (direction === "bear") {
      // Bear FVG: c0.low > c2.high (gap above current price = pullback zone)
      const gap = c0.low - c2.high;
      if (gap >= minSize && c0.low > currentPrice) {
        const poi: POI = {
          top:       c0.low,
          bottom:    c2.high,
          midpoint:  (c0.low + c2.high) / 2,
          type:      "fvg",
          mitigated: false,
        };
        const barsAfter = scan.slice(i + 1);
        poi.mitigated = isMitigated(poi, barsAfter, direction, tolerance);
        if (!poi.mitigated) pois.push({ ...poi, index: i });
      }
    } else {
      // Bull FVG: c2.low > c0.high (gap below current price = pullback zone)
      const gap = c2.low - c0.high;
      if (gap >= minSize && c2.low < currentPrice) {
        const poi: POI = {
          top:       c2.low,
          bottom:    c0.high,
          midpoint:  (c2.low + c0.high) / 2,
          type:      "fvg",
          mitigated: false,
        };
        const barsAfter = scan.slice(i + 1);
        poi.mitigated = isMitigated(poi, barsAfter, direction, tolerance);
        if (!poi.mitigated) pois.push({ ...poi, index: i });
      }
    }
  }

  if (pois.length === 0) return null;

  // Return the most recent unmitigated POI (highest index)
  pois.sort((a, b) => b.index - a.index);
  const { index: _idx, ...poi } = pois[0]!;
  return poi;
}

// ── LTF confirmation (M5) ─────────────────────────────────────────────────────
// Checks for:
// 1. CHoCH (Change of Character) — M5 first breaks structure against pullback direction
//    (signals the pullback may be ending)
// 2. BOS in the trend direction after CHoCH
// 3. An unmitigated LTF OB/FVG at or near current price

function checkLtfConfirmation(
  ltfBars:      OHLCV[],
  direction:    "bull" | "bear",
  currentPrice: number,
): boolean {
  if (ltfBars.length < 15) return false;

  const scan   = ltfBars.slice(-LTF_SCAN_BARS);
  const swings = detectSwings(scan, 2);

  if (direction === "bear") {
    // In a sell pullback: LTF should show a CHoCH (small bullish BOS during pullback)
    // followed by a bearish BOS (confirming pullback is ending, trend resuming)
    const highs = swings.filter((s) => s.type === "high");
    const lows  = swings.filter((s) => s.type === "low");

    // Look for a lower high formation (LH) = CHoCH that says pullback is failing
    if (highs.length >= 2) {
      const lastHigh = highs[highs.length - 1]!;
      const prevHigh = highs[highs.length - 2]!;
      const hasLowerHigh = lastHigh.price < prevHigh.price;

      // And a lower low after the lower high (BOS in bear direction)
      if (hasLowerHigh && lows.length >= 2) {
        const lastLow = lows[lows.length - 1]!;
        const prevLow = lows[lows.length - 2]!;
        const hasLowerLow = lastLow.price < prevLow.price && lastLow.index > lastHigh.index;
        if (hasLowerLow) return true;
      }
    }
  } else {
    // Buy pullback: LTF should show a higher low (HL) CHoCH then higher high BOS
    const highs = swings.filter((s) => s.type === "high");
    const lows  = swings.filter((s) => s.type === "low");

    if (lows.length >= 2) {
      const lastLow  = lows[lows.length - 1]!;
      const prevLow  = lows[lows.length - 2]!;
      const hasHigherLow = lastLow.price > prevLow.price;

      if (hasHigherLow && highs.length >= 2) {
        const lastHigh = highs[highs.length - 1]!;
        const prevHigh = highs[highs.length - 2]!;
        const hasHigherHigh = lastHigh.price > prevHigh.price && lastHigh.index > lastLow.index;
        if (hasHigherHigh) return true;
      }
    }
  }

  return false;
}

// ── Last BOS level ────────────────────────────────────────────────────────────
// The most recent Break of Structure on HTF — used to define the pullback zone boundary

function findLastBosLevel(
  bars:      OHLCV[],
  direction: "bull" | "bear",
): number {
  const scan   = bars.slice(-HTF_SCAN_BARS);
  const swings = detectSwings(scan, SWING_WINDOW);

  if (direction === "bear") {
    // Last BOS down: the last swing low that was broken to create the most recent LL
    const lows = swings.filter((s) => s.type === "low").slice(-4);
    if (lows.length >= 2) return lows[lows.length - 2]!.price;
    return lows[0]?.price ?? bars[bars.length - 1]!.close * 0.99;
  } else {
    const highs = swings.filter((s) => s.type === "high").slice(-4);
    if (highs.length >= 2) return highs[highs.length - 2]!.price;
    return highs[0]?.price ?? bars[bars.length - 1]!.close * 1.01;
  }
}

// ── Main evaluation ───────────────────────────────────────────────────────────

export function evaluatePullbackPoiStrategy(
  ltfBars: OHLCV[],  // M5
  htfBars: OHLCV[],  // H1 or H4
): PullbackPoiResult {
  if (ltfBars.length < 20) return { valid: false, reason: "insufficient LTF bars" };
  if (htfBars.length < 15) return { valid: false, reason: "insufficient HTF bars" };

  const currentPrice = ltfBars[ltfBars.length - 1]!.close;

  // ── Step 1: HTF trend ────────────────────────────────────────────────────
  const htfBias = classifyHtfStructure(htfBars);
  if (htfBias === "none") {
    return { valid: false, reason: "HTF trend unclear — no HH/HL or LL/LH structure" };
  }

  const isBear   = htfBias === "bearish";
  const poiDir   = isBear ? "bear" : "bull";
  const direction = isBear ? "sell" : "buy";

  // ── Step 2: Draw on Liquidity ────────────────────────────────────────────
  const dol = findDrawOnLiquidity(htfBars, poiDir, currentPrice);
  if (dol === null) {
    return {
      valid:  false,
      reason: `no Draw on Liquidity found ${isBear ? "below" : "above"} current price`,
    };
  }

  // ── Step 3: Confirm pullback zone ────────────────────────────────────────
  // For a sell: current price must be ABOVE the DoL (we're in a pullback up)
  // For a buy:  current price must be BELOW the DoL (we're in a pullback down)
  const inPullback = isBear
    ? currentPrice > dol
    : currentPrice < dol;

  if (!inPullback) {
    return { valid: false, reason: "price not in pullback zone relative to Draw on Liquidity" };
  }

  // ── Step 4: Find unmitigated HTF POI in pullback zone ───────────────────
  const bosLevel = findLastBosLevel(htfBars, poiDir);
  const htfPoi   = findUnmitigatedPoi(htfBars, poiDir, currentPrice, bosLevel);

  if (!htfPoi) {
    return {
      valid:  false,
      reason: `no unmitigated HTF POI found in pullback zone`,
    };
  }

  // Current price must be at or inside the HTF POI
  const atPoi = isBear
    ? currentPrice >= htfPoi.bottom && currentPrice <= htfPoi.top + currentPrice * 0.001
    : currentPrice <= htfPoi.top    && currentPrice >= htfPoi.bottom - currentPrice * 0.001;

  if (!atPoi) {
    return {
      valid:  false,
      reason: `price ${currentPrice.toFixed(5)} not yet at HTF POI [${htfPoi.bottom.toFixed(5)}–${htfPoi.top.toFixed(5)}]`,
    };
  }

  // ── Step 5: LTF confirmation ─────────────────────────────────────────────
  const ltfConfirmed = checkLtfConfirmation(ltfBars, poiDir, currentPrice);
  // LTF confirmation is optional — gives confidence boost when present

  // ── Step 6: SL and TP ────────────────────────────────────────────────────
  const slBuffer = currentPrice * 0.0005;

  // SL: beyond the POI boundary
  const slPrice = isBear
    ? htfPoi.top    + slBuffer  // above the OB for sell
    : htfPoi.bottom - slBuffer; // below the OB for buy

  const slDistance = Math.abs(currentPrice - slPrice);
  if (slDistance < currentPrice * 0.0002) {
    return { valid: false, reason: "SL too tight" };
  }

  // TP: exactly at the Draw on Liquidity
  const tpPrice    = dol;
  const tpDistance = Math.abs(tpPrice - currentPrice);
  const rrRatio    = Math.round((tpDistance / slDistance) * 100) / 100;

  if (isBear && tpPrice >= currentPrice) return { valid: false, reason: "TP above entry for sell" };
  if (!isBear && tpPrice <= currentPrice) return { valid: false, reason: "TP below entry for buy" };

  if (rrRatio < 1.5) {
    return { valid: false, reason: `R:R ${rrRatio} below minimum 1.5 — DoL too close` };
  }

  return {
    valid:          true,
    direction,
    entryPrice:     currentPrice,
    slPrice,
    tpPrice,
    slDistance,
    rrRatio,
    htfBias,
    drawOnLiquidity: dol,
    htfPoi,
    ltfConfirmed,
    reason: [
      `HTF ${htfBias} trend`,
      `Draw on Liquidity at ${dol.toFixed(5)}`,
      `Unmitigated ${htfPoi.type} [${htfPoi.bottom.toFixed(5)}–${htfPoi.top.toFixed(5)}]`,
      ltfConfirmed ? "LTF CHoCH + BOS confirmed" : "no LTF confirmation (entry on HTF POI only)",
      `entry ${currentPrice.toFixed(5)} | SL ${slPrice.toFixed(5)} | TP ${tpPrice.toFixed(5)} | R:R ${rrRatio}`,
    ].join(" | "),
  };
}
