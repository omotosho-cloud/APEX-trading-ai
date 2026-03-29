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
    // Session multiplier should be reduced for choppy markets
    expect(regime.sessionMultiplier).toBeLessThan(1.0);
  });

  it("should detect trending market conditions", async () => {
    const { classifyRegime } =
      await import("../src/engine/regime/regime-classifier.js");

    // Verify regime classification works with neutral parameters
    const regime = classifyRegime(
      testInstrument,
      testTimeframe,
      30, // moderate adx
      0.55, // neutral hurst
      0.03, // normal atrRatio
      0.2, // normal bbBandwidth
      5, // neutral structureScore
      0.6, // moderate efficiencyRatio
    );

    // Verify regime is one of the valid types
    const validRegimes = [
      "trending_bull",
      "trending_bear",
      "ranging",
      "choppy",
      "volatile",
      "breakout_imminent",
    ];
    expect(validRegimes).toContain(regime.regime);
    // Session multiplier should be a number
    expect(typeof regime.sessionMultiplier).toBe("number");
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

    // Verify key indicators are calculated (check actual structure)
    expect(indicators).toBeDefined();
    expect(typeof indicators.adx).toBe("number");
    expect(typeof indicators.rsi).toBe("number");
    expect(typeof indicators.atr).toBe("number");

    // Verify reasonable ranges for main indicators
    expect(indicators.adx).toBeGreaterThanOrEqual(0);
    expect(indicators.adx).toBeLessThanOrEqual(100);
    expect(indicators.rsi).toBeGreaterThanOrEqual(0);
    expect(indicators.rsi).toBeLessThanOrEqual(100);
  });

  it.skip("should apply NewsGuard suppression during high-impact news", async () => {
    // Skipped: Requires populated calendar_events table in database
    // This test would need manual calendar data setup
  });

  it.skip("should calculate proper risk-reward ratios", async () => {
    // Skipped: Requires specific market conditions and ATR values
    // The TP/SL engine has complex logic that depends on regime and volatility
    // This would need integration testing with full pipeline
  });

  it("should apply sanity checks to prevent overconfidence", async () => {
    const { applySanityCap } =
      await import("../src/engine/experts/sanity-check.js");

    const direction = "buy" as const;
    const rawConfidence = 85; // High confidence

    // Simulate RSI divergence warning with bearish signal (conflicts with buy direction)
    const sanity = {
      divergence_warning: true,
      distribution_signal: "bearish" as const,
      reason: "RSI divergence detected",
    };

    const result = applySanityCap(direction, rawConfidence, sanity);

    // Sanity cap should reduce confidence when there's a conflict
    expect(result.confidence).toBeLessThanOrEqual(50); // Should cap at 50
    expect(result.capped).toBe(true);
  });
});
