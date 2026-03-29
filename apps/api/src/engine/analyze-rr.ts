import { readFileSync } from "fs";

const data = JSON.parse(readFileSync("backtest-live-results.json", "utf8"));

// Reconstruct outcome breakdown from monthly data
// We need to re-run with outcome tracking — for now analyze what we have

console.log("\n=== R:R IMPROVEMENT ANALYSIS ===\n");

console.log("Current ATR multipliers (from tp-sl-engine.ts):");
console.log("  trending_bull/bear:  SL=1.5x  TP1=1.5x  TP2=3.0x  → R:R at TP1=1.0, TP2=2.0");
console.log("  breakout_imminent:   SL=2.0x  TP1=2.0x  TP2=4.0x  → R:R at TP1=1.0, TP2=2.0");
console.log("  ranging:             SL=1.2x  TP1=1.0x  TP2=2.0x  → R:R at TP1=0.83, TP2=1.67");
console.log("  volatile:            SL=2.5x  TP1=1.2x  TP2=2.0x  → R:R at TP1=0.48, TP2=0.80");

console.log("\nTo achieve 1:1.5 minimum at TP1, options:");
console.log("  Option A — Tighten SL:  trending SL=1.0x TP1=1.5x → R:R=1.5  (risk: more SL hits)");
console.log("  Option B — Widen TP1:  trending SL=1.5x TP1=2.25x → R:R=1.5  (risk: fewer TP1 hits)");
console.log("  Option C — Both:       trending SL=1.2x TP1=1.8x  → R:R=1.5  (balanced)");

console.log("\nCurrent combined stats:");
const c = data.combinedStats;
console.log(`  Win rate: ${c.winRate}%  Expectancy: ${c.expectancy}R  PF: ${c.profitFactor}`);

console.log("\nIf we improve R:R to 1.5 at TP1 (keeping same win rate):");
const wr = c.winRate / 100;
const newTP1 = 1.5;
const newTP2 = 3.0;
const slCost = 1.0;
// Assume 40% tp1, 12% tp2, 48% sl/expired based on 52% win rate
const tp1Rate = 0.35;
const tp2Rate = 0.17;
const slRate  = 0.48;
const newEV = tp1Rate * newTP1 + tp2Rate * newTP2 - slRate * slCost;
const newPF = (tp1Rate * newTP1 + tp2Rate * newTP2) / (slRate * slCost);
console.log(`  Estimated expectancy: +${newEV.toFixed(2)}R per trade (vs current +${c.expectancy}R)`);
console.log(`  Estimated profit factor: ${newPF.toFixed(2)} (vs current ${c.profitFactor})`);
console.log(`  Improvement: ${((newEV / c.expectancy - 1) * 100).toFixed(0)}% better expectancy`);

console.log("\nIf we improve R:R to 2.0 at TP1:");
const newTP1b = 2.0;
const newTP2b = 4.0;
const newEVb = tp1Rate * newTP1b + tp2Rate * newTP2b - slRate * slCost;
const newPFb = (tp1Rate * newTP1b + tp2Rate * newTP2b) / (slRate * slCost);
console.log(`  Estimated expectancy: +${newEVb.toFixed(2)}R per trade`);
console.log(`  Estimated profit factor: ${newPFb.toFixed(2)}`);
console.log(`  BUT: win rate will drop because TP1 is harder to reach`);
console.log(`  If win rate drops to 45%: EV = ${(0.28*newTP1b + 0.17*newTP2b - 0.55*slCost).toFixed(2)}R`);

console.log("\nBest approach: tighten SL using structure-based stops instead of pure ATR");
console.log("  Current: SL = entry - 1.5 * ATR  (arbitrary)");
console.log("  Better:  SL = last swing low/high (structure-based) — typically 0.8-1.2x ATR");
console.log("  Result:  same TP distances, tighter SL = better R:R without changing win rate");

process.exit(0);
