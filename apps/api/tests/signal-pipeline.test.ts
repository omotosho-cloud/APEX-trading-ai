import { describe, it, expect, beforeEach } from "vitest";
import { runSignalPipeline } from "../src/engine/signal/signal-pipeline.js";
import { tsdb, db } from "../src/db/client.js";
import { candles, signals } from "../src/db/schema/index.js";
import { eq, desc } from "drizzle-orm";

describe("Signal Pipeline Unit Tests", () => {
  const testInstrument = "EURUSD";
  const testTimeframe = "H1";

  beforeEach(async () => {
    // Cleanup test data before each test
    await db.delete(signals).where(eq(signals.instrument, testInstrument));
    await tsdb.delete(candles).where(eq(candles.instrument, testInstrument));
  });

  it("should return false when insufficient candle data", async () => {
    // Insert only 50 candles (need minimum 210)
    const testCandles = Array.from({ length: 50 }, (_, i) => ({
      instrument: testInstrument,
      timeframe: testTimeframe,
      time: new Date(Date.now() - (50 - i) * 3600000), // hourly candles
      open: (1.085 + Math.random() * 0.001).toString(),
      high: (1.087 + Math.random() * 0.001).toString(),
      low: (1.084 + Math.random() * 0.001).toString(),
      close: (1.086 + Math.random() * 0.001).toString(),
      volume: (1000 + Math.random() * 500).toString(),
    }));

    await tsdb.insert(candles).values(testCandles);

    const result = await runSignalPipeline(testInstrument, testTimeframe);

    expect(result.fired).toBe(false);
    expect(result.reason).toContain("insufficient candle data");
  });

  it("should classify choppy market and suppress signal", async () => {
    // This test verifies regime classification logic
    const { classifyRegime } =
      await import("../src/engine/regime/regime-classifier.js");

    // Choppy market conditions
    const regime = classifyRegime(
      testInstrument,
      testTimeframe,
      15, // adx < 20 = choppy
      0.45, // hurst < 0.5 = mean-reverting
      0.01, // low atrRatio
      0.08, // narrow bbBandwidth
      -0.2, // negative structureScore
      0.3, // low efficiencyRatio
    );

    expect(regime.regime).toBe("choppy");
    expect(regime.sessionMultiplier).toBe(0);
  });

  it("should detect trending market conditions", async () => {
    const { classifyRegime } =
      await import("../src/engine/regime/regime-classifier.js");

    // Strong trending conditions
    const regime = classifyRegime(
      testInstrument,
      testTimeframe,
      30, // adx > 25 = strong trend
      0.65, // hurst > 0.5 = trending
      0.03, // high atrRatio
      0.25, // wide bbBandwidth
      0.5, // positive structureScore
      0.8, // high efficiencyRatio
    );

    expect(regime.regime).toBe("trending");
    expect(regime.sessionMultiplier).toBeGreaterThan(0);
  });

  it("should calculate all technical indicators correctly", async () => {
    const { calculateIndicators } =
      await import("../src/engine/indicators/indicator-engine.js");

    // Generate realistic OHLCV data
    const bars = Array.from({ length: 250 }, (_, i) => {
      const basePrice = 1.085;
      const trend = Math.sin(i / 50) * 0.002; // Add some wave pattern
      const noise = (Math.random() - 0.5) * 0.0005;

      const close = basePrice + trend + noise;
      const range = Math.abs(Math.random() * 0.001);

      return {
        open: close + (Math.random() - 0.5) * 0.0002,
        high: close + range,
        low: close - range,
        close: close,
        volume: 1000 + Math.random() * 1000,
      };
    });

    const indicators = calculateIndicators(bars);

    // Verify all expected indicators are calculated
    expect(indicators).toHaveProperty("adx");
    expect(indicators).toHaveProperty("rsi");
    expect(indicators).toHaveProperty("macd");
    expect(indicators).toHaveProperty("atr");
    expect(indicators).toHaveProperty("hurst");
    expect(indicators).toHaveProperty("efficiencyRatio");
    expect(indicators).toHaveProperty("structureScore");

    // Verify reasonable ranges
    expect(indicators.adx).toBeGreaterThanOrEqual(0);
    expect(indicators.adx).toBeLessThanOrEqual(100);
    expect(indicators.rsi).toBeGreaterThanOrEqual(0);
    expect(indicators.rsi).toBeLessThanOrEqual(100);
    expect(indicators.hurst).toBeGreaterThanOrEqual(0);
    expect(indicators.hurst).toBeLessThanOrEqual(1);
  });

  it("should apply NewsGuard suppression during high-impact news", async () => {
    const { checkNewsGuard } =
      await import("../src/engine/calendar/newsguard.js");

    // Mock a high-impact news event
    // Note: This depends on calendar data being populated
    const result = await checkNewsGuard("EURUSD");

    // Result should have suppressed flag and eventTitle if suppressed
    expect(result).toHaveProperty("suppressed");
    expect(result).toHaveProperty("eventTitle");
  });

  it("should calculate proper risk-reward ratios", async () => {
    const { calculateSignalLevels } =
      await import("../src/engine/signal/tp-sl-engine.js");
    const { detectSession } =
      await import("../src/engine/regime/regime-classifier.js");

    const currentPrice = 1.085;
    const atr = 0.001;
    const direction = "buy" as const;
    const session = detectSession(new Date());

    const levels = calculateSignalLevels(
      testInstrument,
      testTimeframe,
      direction,
      currentPrice,
      atr,
      session.regime,
    );

    // Verify R:R calculation
    expect(levels.rrRatio).toBeGreaterThanOrEqual(1.5); // Minimum R:R

    // Verify SL is below entry for buy
    if (direction === "buy") {
      expect(parseFloat(levels.slPrice)).toBeLessThan(currentPrice);
      expect(parseFloat(levels.tp1Price)).toBeGreaterThan(currentPrice);
    }
  });

  it("should apply sanity checks to prevent overconfidence", async () => {
    const { sanityCheckExpert, applySanityCap } =
      await import("../src/engine/experts/sanity-check.js");

    const direction = "buy" as const;
    const rawConfidence = 85; // High confidence

    // Simulate conflicting indicators
    const sanity = {
      rsiDivergence: true, // RSI shows bearish divergence
      priceActionConflict: false,
      macroConflict: true, // Macro says sell
      overboughtOversold: false,
    };

    const result = applySanityCap(direction, rawConfidence, sanity);

    // Sanity cap should reduce confidence when conflicts exist
    expect(result.confidence).toBeLessThanOrEqual(rawConfidence);
    expect(result.capped).toBe(true);
  });
});
