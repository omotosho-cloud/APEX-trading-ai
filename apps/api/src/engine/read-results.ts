import { readFileSync } from "fs";

const data = JSON.parse(readFileSync("backtest-live-results.json", "utf8"));

console.log("\n=== PROFITABILITY DEEP DIVE ===\n");

const c = data.combinedStats;
console.log("COMBINED (all pairs, all time):");
console.log(`  Win rate:       ${c.winRate}%`);
console.log(`  Profit factor:  ${c.profitFactor}`);
console.log(`  Expectancy:     ${c.expectancy}R per trade`);
console.log(`  Total R:        ${c.totalR}R`);
console.log(`  Sharpe:         ${c.sharpe}`);
console.log(`  Max drawdown:   ${c.maxDrawdown}%`);
console.log(`  Trades:         ${c.trades}`);

if (data.oosStats) {
  const o = data.oosStats;
  console.log("\nOUT-OF-SAMPLE (2025+ only):");
  console.log(`  Win rate:       ${o.winRate}%`);
  console.log(`  Profit factor:  ${o.profitFactor}`);
  console.log(`  Expectancy:     ${o.expectancy}R per trade`);
  console.log(`  Total R:        ${o.totalR}R`);
  console.log(`  Sharpe:         ${o.sharpe}`);
  console.log(`  Max drawdown:   ${o.maxDrawdown}%`);
  console.log(`  Trades:         ${o.trades}`);
}

console.log("\nPER PAIR (H4):");
for (const r of data.results) {
  const c2 = r.combined;
  const o2 = r.outOfSample;
  console.log(`\n  ${r.instrument} [${r.dataYears}y]`);
  console.log(`    Combined: WR=${c2.winRate}% PF=${c2.profitFactor} Sharpe=${c2.sharpe} DD=${c2.maxDrawdown}% EV=${c2.expectancy}R total=${c2.totalR}R n=${c2.trades}`);
  if (o2) console.log(`    OOS 2025: WR=${o2.winRate}% PF=${o2.profitFactor} Sharpe=${o2.sharpe} DD=${o2.maxDrawdown}% EV=${o2.expectancy}R total=${o2.totalR}R n=${o2.trades}`);
}

const months = data.monthly;
const profitable = months.filter((m: any) => m.totalR > 0).length;
const losing     = months.filter((m: any) => m.totalR < 0).length;
const bigLoss    = months.filter((m: any) => m.totalR < -10).length;
const bigWin     = months.filter((m: any) => m.totalR > 10).length;
const avgWinMonth  = months.filter((m: any) => m.totalR > 0).reduce((s: number, m: any) => s + m.totalR, 0) / (profitable || 1);
const avgLossMonth = months.filter((m: any) => m.totalR < 0).reduce((s: number, m: any) => s + m.totalR, 0) / (losing || 1);

console.log("\nMONTHLY DISTRIBUTION:");
console.log(`  Profitable months:  ${profitable}/${months.length} (${(profitable/months.length*100).toFixed(0)}%)`);
console.log(`  Losing months:      ${losing}/${months.length}`);
console.log(`  Big loss (>10R):    ${bigLoss} months`);
console.log(`  Big win  (>10R):    ${bigWin} months`);
console.log(`  Avg winning month:  +${avgWinMonth.toFixed(1)}R`);
console.log(`  Avg losing month:   ${avgLossMonth.toFixed(1)}R`);
console.log(`  Reward/risk ratio:  ${Math.abs(avgWinMonth/avgLossMonth).toFixed(2)}x`);

process.exit(0);
