import "dotenv/config";
import { tsdb } from "../db/client.js";
import { candles } from "../db/schema/index.js";
import { and, eq, asc } from "drizzle-orm";
import { calculateIndicators } from "./indicators/indicator-engine.js";
import { calculateSignalLevels } from "./signal/tp-sl-engine.js";
import { classifyRaw } from "./regime/regime-classifier.js";

const rows = await tsdb
  .select().from(candles)
  .where(and(eq(candles.instrument, "EURUSD"), eq(candles.timeframe, "M15")))
  .orderBy(asc(candles.time)).limit(400);

const bars = rows.map((r) => ({
  open: +r.open, high: +r.high, low: +r.low, close: +r.close, volume: +r.volume,
}));

let checked = 0;
for (let i = 250; i < Math.min(260, bars.length); i++) {
  const ind = calculateIndicators(bars.slice(i - 250, i));
  const { regime } = classifyRaw(ind.adx, ind.hurst, ind.atrRatio, ind.bbBandwidth, ind.structureScore, ind.efficiencyRatio);
  const price = bars[i]!.close;
  const buyLevels  = calculateSignalLevels("EURUSD", "M15", "buy",  price, ind.atr, regime);
  const sellLevels = calculateSignalLevels("EURUSD", "M15", "sell", price, ind.atr, regime);
  console.log(`bar ${i}: price=${price.toFixed(5)} atr=${ind.atr.toFixed(6)} regime=${regime}`);
  console.log(`  BUY  → entry=${buyLevels.entryPrice.toFixed(5)} sl=${buyLevels.slPrice.toFixed(5)} tp1=${buyLevels.tp1Price.toFixed(5)} rr=${buyLevels.rrRatio} passes=${buyLevels.passes}`);
  console.log(`  SELL → entry=${sellLevels.entryPrice.toFixed(5)} sl=${sellLevels.slPrice.toFixed(5)} tp1=${sellLevels.tp1Price.toFixed(5)} rr=${sellLevels.rrRatio} passes=${sellLevels.passes}`);
  checked++;
}
console.log(`\nChecked ${checked} bars`);
process.exit(0);
