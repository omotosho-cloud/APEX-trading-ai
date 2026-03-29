import "dotenv/config";
import { tsdb } from "../db/client.js";
import { candles } from "../db/schema/index.js";
import { and, eq, asc } from "drizzle-orm";
import { calculateIndicators } from "./indicators/indicator-engine.js";
import { classifyRegime } from "./regime/regime-classifier.js";

const rows = await tsdb
  .select()
  .from(candles)
  .where(and(eq(candles.instrument, "EURUSD"), eq(candles.timeframe, "M15")))
  .orderBy(asc(candles.time))
  .limit(600);

const bars = rows.map((r) => ({
  open: +r.open, high: +r.high, low: +r.low, close: +r.close, volume: +r.volume,
}));

console.log(`Total bars fetched: ${bars.length}`);

const regimeCounts: Record<string, number> = {};
let totalConf = 0, count = 0;

for (let i = 270; i < bars.length; i++) {
  const ind = calculateIndicators(bars.slice(i - 250, i));
  const r = classifyRegime("EURUSD", "M15", ind.adx, ind.hurst, ind.atrRatio, ind.bbBandwidth, ind.structureScore, ind.efficiencyRatio);
  regimeCounts[r.regime] = (regimeCounts[r.regime] ?? 0) + 1;
  totalConf += r.confidence;
  count++;

  if (i === 275) {
    console.log(`\nSample bar ${i}:`);
    console.log(`  ADX=${ind.adx.toFixed(1)} Hurst=${ind.hurst.toFixed(2)} ATRratio=${ind.atrRatio.toFixed(2)} BBbw=${ind.bbBandwidth.toFixed(4)} struct=${ind.structureScore} ER=${ind.efficiencyRatio.toFixed(2)}`);
    console.log(`  → regime=${r.regime} conf=${r.confidence} session=${r.session} mult=${r.sessionMultiplier}`);
  }
}

console.log(`\nRegime distribution over ${count} bars:`);
for (const [regime, n] of Object.entries(regimeCounts).sort((a,b) => b[1]-a[1])) {
  const pct = ((n/count)*100).toFixed(1);
  console.log(`  ${regime.padEnd(22)} ${String(n).padStart(4)} bars  (${pct}%)`);
}
console.log(`\nAvg confidence: ${(totalConf/count).toFixed(1)}`);

process.exit(0);
