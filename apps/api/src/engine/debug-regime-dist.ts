import "dotenv/config";
import { tsdb } from "../db/client.js";
import { candles } from "../db/schema/index.js";
import { and, eq, asc } from "drizzle-orm";
import { calculateIndicators } from "./indicators/indicator-engine.js";
import { classifyRaw } from "./regime/regime-classifier.js";
import type { OHLCV } from "./indicators/indicator-engine.js";

const LOOKBACK = 250;

async function run() {
  const rows = await tsdb
    .select()
    .from(candles)
    .where(and(eq(candles.instrument, "EURUSD"), eq(candles.timeframe, "H4")))
    .orderBy(asc(candles.time))
    .limit(2000);

  const bars: OHLCV[] = rows.map((r) => ({
    open: parseFloat(r.open), high: parseFloat(r.high),
    low: parseFloat(r.low),   close: parseFloat(r.close),
    volume: parseFloat(r.volume),
  }));

  const regimeCounts: Record<string, number> = {};
  let sanityBlocked = 0;
  let rrBlocked = 0;
  let confBlocked = 0;
  let passed = 0;

  for (let i = LOOKBACK; i < bars.length - 10; i++) {
    const window = bars.slice(i - LOOKBACK, i);
    const ind = calculateIndicators(window);
    const { regime, confidence } = classifyRaw(
      ind.adx, ind.hurst, ind.atrRatio, ind.bbBandwidth,
      ind.structureScore, ind.efficiencyRatio, ind.plusDI, ind.minusDI,
    );
    regimeCounts[regime] = (regimeCounts[regime] ?? 0) + 1;

    // Sample indicator values at first non-choppy bar
    if (regime !== "choppy" && passed + sanityBlocked + rrBlocked + confBlocked < 5) {
      console.log(`\nBar ${i} | regime=${regime} conf=${confidence}`);
      console.log(`  ADX=${ind.adx.toFixed(1)} Hurst=${ind.hurst.toFixed(2)} structureScore=${ind.structureScore} effRatio=${ind.efficiencyRatio.toFixed(2)}`);
      console.log(`  atrRatio=${ind.atrRatio.toFixed(2)} bbBandwidth=${ind.bbBandwidth.toFixed(4)} +DI=${ind.plusDI.toFixed(1)} -DI=${ind.minusDI.toFixed(1)}`);
      console.log(`  RSI=${ind.rsi.toFixed(1)} macdHist=${ind.macdHistogram.toFixed(5)}`);
    }

    if (regime !== "choppy" && confidence >= 55) passed++;
    else if (regime !== "choppy" && confidence < 55) confBlocked++;
  }

  console.log("\n── Regime distribution (EURUSD H4, 2000 bars) ──");
  for (const [r, n] of Object.entries(regimeCounts).sort((a, b) => b[1] - a[1])) {
    const pct = ((n / (bars.length - LOOKBACK)) * 100).toFixed(1);
    console.log(`  ${r.padEnd(22)} ${String(n).padStart(5)} bars  (${pct}%)`);
  }
  console.log(`\n  Passed regime+conf gate: ${passed}`);
  console.log(`  Blocked by conf < 55:    ${confBlocked}`);

  process.exit(0);
}

run().catch((err) => { console.error(err); process.exit(1); });
