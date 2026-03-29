import { getHistoricalRates } from "dukascopy-node";

const start = Date.now();
console.log("Fetching EURUSD H1 for 1 year (2020)...");

const data = await getHistoricalRates({
  instrument: "eurusd" as any,
  dates: { from: new Date("2020-01-01"), to: new Date("2021-01-01") },
  timeframe: "h1",
  format: "array",
  useCache: false,
});

const elapsed = ((Date.now() - start) / 1000).toFixed(1);
console.log(`rows: ${(data as any[]).length} | time: ${elapsed}s`);
console.log(`Estimated for 6 years: ${(parseFloat(elapsed) * 6).toFixed(0)}s per pair`);
console.log(`Estimated for 30 combinations (10 pairs × 3 TFs): ${(parseFloat(elapsed) * 6 * 30 / 60).toFixed(0)} minutes`);
process.exit(0);
