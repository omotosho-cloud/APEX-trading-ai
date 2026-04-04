/**
 * APEX — FundedNext Prop Firm Simulation
 * Run: pnpm backtest:propfirm
 *
 * Exact rules:
 *   Daily DD:     -3% from day's opening balance → stop trading for the day
 *   Monthly blow: -8% from ORIGINAL account size ($10k) → account blown
 *                 This accumulates across consecutive losing months
 *   Profit month: withdraw ALL profit → account ALWAYS resets to $10k
 *   Loss month:   carry reduced balance forward, DD keeps accumulating from $10k
 *   Recovery:     any profit month → withdraw → reset to $10k regardless
 *
 * Example on $10k:
 *   Month 1: $10,000 → +$500 profit  → withdraw $400 (80%) → reset to $10,000
 *   Month 2: $10,000 → -$300 loss    → carry $9,700 forward
 *   Month 3: $9,700  → -$400 loss    → carry $9,300 forward
 *            DD from $10k = 7% — still alive
 *   Month 4: $9,300  → -$100 loss    → $9,200 → DD = 8% → BLOWN
 *   BUT if Month 3 was profit:
 *   Month 3: $9,700  → +$200 profit  → withdraw $160 → reset to $10,000
 *   Month 4: $10,000 → fresh start, DD clock resets
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// ─── Load data ────────────────────────────────────────────────────────────────

const raw = JSON.parse(
  readFileSync(resolve(process.cwd(), "backtest-live-results.json"), "utf-8"),
) as {
  monthly: { month: string; trades: number; wins: number; winRate: number; totalR: number }[];
};

const MONTHS = raw.monthly.sort((a, b) => a.month.localeCompare(b.month));

// ─── Config ───────────────────────────────────────────────────────────────────

type FirmConfig = {
  name:         string;
  challengeFee: number;
  accountSize:  number;  // original account size — DD always measured from this
};

const ACCOUNTS: FirmConfig[] = [
  { name: "FundedNext $10k",  challengeFee: 99,  accountSize: 10_000  },
  { name: "FundedNext $25k",  challengeFee: 199, accountSize: 25_000  },
  { name: "FundedNext $50k",  challengeFee: 299, accountSize: 50_000  },
  { name: "FundedNext $100k", challengeFee: 499, accountSize: 100_000 },
];

const PHASE1_TARGET  = 0.08;  // +8% to pass phase 1
const PHASE2_TARGET  = 0.04;  // +4% to pass phase 2
const DAILY_DD       = 0.03;  // -3% from day open → stop trading for the day
const BLOW_DD        = 0.08;  // -8% from ORIGINAL account size → blown
const PROFIT_SPLIT   = 0.80;  // trader keeps 80%
const BASE_RISK      = 0.01;  // 1% risk per trade
const NEWS_REDUCTION = 0.20;  // 20% fewer trades (news ±10min + weekend)

// ─── Apply news/weekend filter ────────────────────────────────────────────────

function applyRules(m: typeof MONTHS[0]): typeof MONTHS[0] {
  const f = 1 - NEWS_REDUCTION;
  return {
    ...m,
    trades: Math.round(m.trades * f),
    wins:   Math.round(m.wins   * f),
    totalR: Math.round(m.totalR * f * 100) / 100,
  };
}

// ─── Simulate one month ───────────────────────────────────────────────────────

type MonthSim = {
  endBalance:  number;   // balance after all trades (before withdrawal)
  pnlDollar:   number;   // gross P&L vs openBalance
  pnlPct:      number;
  withdrawn:   number;   // your payout: profit × 80%
  nextBalance: number;   // what next month opens at
  blown:       boolean;
  dailyStopped: boolean; // daily DD fired at least once
  failReason:  string | null;
};

function simMonth(
  monthData:    typeof MONTHS[0],
  openBalance:  number,   // what this month opens at (may be < originalSize after losses)
  originalSize: number,   // ALWAYS the original account size — DD reference
  isPhase:      boolean,  // true = challenge/verify, no withdrawal
): MonthSim {
  const adj       = applyRules(monthData);
  const trades    = adj.trades;
  const rPerTrade = trades > 0 ? adj.totalR / trades : 0;

  let balance      = openBalance;
  let dayStart     = openBalance;
  let blown        = false;
  let dailyStopped = false;
  let dailyHit     = false;
  let failReason: string | null = null;

  for (let t = 0; t < trades; t++) {
    if (blown) break;

    // New trading day every 3 H4 bars (~12h)
    if (t > 0 && t % 3 === 0) {
      dayStart     = balance;
      dailyStopped = false;
    }

    // Skip rest of day if daily DD already hit today
    if (dailyStopped) continue;

    // Apply trade — risk 1% of current balance
    balance += rPerTrade * balance * BASE_RISK;

    // Daily DD: -3% from THIS day's opening balance → stop for the day
    const dailyDD = (dayStart - balance) / dayStart;
    if (dailyDD >= DAILY_DD) {
      dailyStopped = true;
      dailyHit     = true;
      continue;  // stop for the day, NOT blown
    }

    // Blow check: -8% from ORIGINAL account size (accumulates across months)
    const totalDD = (originalSize - balance) / originalSize;
    if (totalDD >= BLOW_DD) {
      blown      = true;
      failReason = `DD ${(totalDD * 100).toFixed(1)}% from $${originalSize.toLocaleString()} (limit ${(BLOW_DD * 100).toFixed(0)}%)`;
      break;
    }
  }

  const pnlDollar = balance - openBalance;
  const pnlPct    = Math.round(pnlDollar / openBalance * 10000) / 100;

  // Withdrawal & reset logic:
  //   Profit month → withdraw all profit → account ALWAYS resets to originalSize
  //   Loss month   → no withdrawal → carry reduced balance forward
  //   Phase sim    → no withdrawal, balance carries forward
  let withdrawn   = 0;
  let nextBalance = balance;

  if (!isPhase && pnlDollar > 0 && !blown) {
    withdrawn   = Math.round(pnlDollar * PROFIT_SPLIT * 100) / 100;
    nextBalance = originalSize;  // ALWAYS reset to $10k (or $25k etc.)
  }

  return {
    endBalance:   Math.round(balance * 100) / 100,
    pnlDollar:    Math.round(pnlDollar * 100) / 100,
    pnlPct,
    withdrawn,
    nextBalance:  Math.round(nextBalance * 100) / 100,
    blown,
    dailyStopped: dailyHit,
    failReason,
  };
}

// ─── Simulate challenge / verification phase ──────────────────────────────────

type PhaseResult = {
  passed: boolean; pnlPct: number; monthsUsed: number;
  maxDD: number; failReason: string | null;
};

function simPhase(
  months:   typeof MONTHS,
  startIdx: number,
  target:   number,
): { result: PhaseResult; nextIdx: number } {
  let balance     = 1.0;
  const origSize  = 1.0;
  let maxDD       = 0;
  let failReason: string | null = null;
  let passed      = false;
  let tradingDays = 0;
  let idx         = startIdx;

  for (; idx < months.length; idx++) {
    const m = simMonth(months[idx]!, balance, origSize, true);
    balance = m.endBalance;

    const dd = (origSize - balance) / origSize;
    maxDD    = Math.max(maxDD, dd);
    tradingDays += Math.ceil(applyRules(months[idx]!).trades / 3);

    if (m.blown) { failReason = m.failReason; idx++; break; }
    if (balance - 1.0 >= target && tradingDays >= 5) { passed = true; idx++; break; }
  }

  return {
    result: {
      passed,
      pnlPct:     Math.round((balance - 1.0) * 10000) / 100,
      monthsUsed: idx - startIdx,
      maxDD:      Math.round(maxDD * 10000) / 100,
      failReason,
    },
    nextIdx: idx,
  };
}

// ─── Simulate funded account ──────────────────────────────────────────────────

type FundedMonthResult = {
  month:        string;
  openBalance:  number;   // what this month opened at
  tradeClose:   number;   // balance after all trades
  nextBalance:  number;   // what next month opens at
  pnlPct:       number;
  pnlDollar:    number;
  withdrawn:    number;   // your 80% payout
  ddFromOrigin: number;   // current DD % from original $10k
  dailyHit:     boolean;  // daily DD fired this month
  blown:        boolean;
  failReason:   string | null;
};

type FundedResult = {
  monthResults:   FundedMonthResult[];
  totalWithdrawn: number;
  blown:          boolean;
  monthsActive:   number;
  profMonths:     number;
  lossMonths:     number;
  avgWinMonth:    number;
  avgLossMonth:   number;
  bestMonth:      number;
  worstMonth:     number;
};

function simFunded(
  months:      typeof MONTHS,
  startIdx:    number,
  accountSize: number,
): FundedResult {
  let balance        = accountSize;
  const originalSize = accountSize;
  let blown          = false;
  let totalWithdrawn = 0;
  const results: FundedMonthResult[] = [];

  for (let idx = startIdx; idx < months.length; idx++) {
    // When blown: restart with fresh account next month
    if (blown) {
      balance = accountSize;
      blown   = false;
    }

    const openBalance = balance;
    const m = simMonth(months[idx]!, balance, originalSize, false);

    const ddFromOrigin = Math.round((originalSize - m.endBalance) / originalSize * 10000) / 100;

    balance = m.nextBalance;
    if (m.withdrawn > 0) totalWithdrawn += m.withdrawn;

    // Mark blown but don't break — continue to next month with fresh account
    const wasBlown = m.blown;
    if (wasBlown) blown = true;

    results.push({
      month:        months[idx]!.month,
      openBalance:  Math.round(openBalance * 100) / 100,
      tradeClose:   m.endBalance,
      nextBalance:  Math.round(balance * 100) / 100,
      pnlPct:       m.pnlPct,
      pnlDollar:    m.pnlDollar,
      withdrawn:    m.withdrawn,
      ddFromOrigin: Math.max(0, ddFromOrigin),
      dailyHit:     m.dailyStopped,
      blown:        wasBlown,
      failReason:   m.failReason,
    });
  }

  const profMonths = results.filter((r) => r.pnlDollar > 0 && !r.blown);
  const lossMonths = results.filter((r) => r.pnlDollar <= 0 && !r.blown);

  return {
    monthResults:   results,
    totalWithdrawn: Math.round(totalWithdrawn * 100) / 100,
    blown:          false,  // never permanently blown in continuous mode
    monthsActive:   results.filter((r) => !r.blown).length,
    profMonths:     profMonths.length,
    lossMonths:     lossMonths.length,
    avgWinMonth:    profMonths.length > 0
      ? Math.round(profMonths.reduce((s, r) => s + r.withdrawn, 0) / profMonths.length * 100) / 100 : 0,
    avgLossMonth:   lossMonths.length > 0
      ? Math.round(lossMonths.reduce((s, r) => s + r.pnlDollar, 0) / lossMonths.length * 100) / 100 : 0,
    bestMonth:      results.length > 0 ? Math.max(...results.map((r) => r.withdrawn)) : 0,
    worstMonth:     results.length > 0 ? Math.min(...results.map((r) => r.pnlDollar)) : 0,
  };
}

// ─── Monte Carlo ──────────────────────────────────────────────────────────────

type MCResult = {
  phase1PassRate:  number;
  fundedReachRate: number;
  avgMonthsActive: number;
  blownRate:       number;
  avgTotalEarned:  number;
  avgWinMonth:     number;
  avgLossMonth:    number;
  pctMonthsProfit: number;
  attemptsNeeded:  number;
};

function monteCarlo(accountSize: number, runs = 500): MCResult {
  let phase1Passed = 0, fundedReached = 0;
  let totalMonthsActive = 0, totalBlown = 0;
  let totalEarned = 0, totalWinMonths = 0, totalLossMonths = 0;
  let totalWinCut = 0, totalLossDollar = 0, totalAttempts = 0;

  for (let r = 0; r < runs; r++) {
    const shuffled = [...MONTHS].sort(() => Math.random() - 0.5);
    let attempts = 0;

    let p1Result: PhaseResult | null = null;
    let p1Next = 0;
    for (let a = 0; a < 4; a++) {
      attempts++;
      const { result, nextIdx } = simPhase(shuffled, 0, PHASE1_TARGET);
      if (result.passed) { p1Result = result; p1Next = nextIdx; break; }
    }
    if (!p1Result) continue;
    phase1Passed++;
    totalAttempts += attempts;

    const { result: p2, nextIdx: p2Next } = simPhase(shuffled, p1Next, PHASE2_TARGET);
    if (!p2.passed) continue;
    fundedReached++;

    const funded = simFunded(shuffled, 0, accountSize);
    totalMonthsActive += funded.monthsActive;
    if (funded.blown) totalBlown++;
    totalEarned     += funded.totalWithdrawn;
    totalWinMonths  += funded.profMonths;
    totalLossMonths += funded.lossMonths;
    totalWinCut     += funded.avgWinMonth * funded.profMonths;
    totalLossDollar += funded.avgLossMonth * funded.lossMonths;
  }

  const fr = fundedReached || 1;
  const tm = totalWinMonths + totalLossMonths || 1;

  return {
    phase1PassRate:  Math.round(phase1Passed  / runs * 1000) / 10,
    fundedReachRate: Math.round(fundedReached / runs * 1000) / 10,
    avgMonthsActive: Math.round(totalMonthsActive / fr * 10) / 10,
    blownRate:       Math.round(totalBlown / fr * 1000) / 10,
    avgTotalEarned:  Math.round(totalEarned / fr * 100) / 100,
    avgWinMonth:     Math.round(totalWinCut / (totalWinMonths || 1) * 100) / 100,
    avgLossMonth:    Math.round(totalLossDollar / (totalLossMonths || 1) * 100) / 100,
    pctMonthsProfit: Math.round(totalWinMonths / tm * 1000) / 10,
    attemptsNeeded:  Math.round(totalAttempts / (phase1Passed || 1) * 10) / 10,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function run() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║   APEX — FundedNext Prop Firm Simulation                ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`\nData: ${MONTHS.length} months (${MONTHS[0]!.month} → ${MONTHS[MONTHS.length-1]!.month})`);
  console.log(`\nRules:`);
  console.log(`  1% risk per trade`);
  console.log(`  Daily DD:     -3% from day open → stop trading for the day`);
  console.log(`  Blow limit:   -8% from original account size (accumulates)`);
  console.log(`  Profit month: withdraw all profit → account ALWAYS resets to $10k`);
  console.log(`  Loss month:   carry balance forward, DD keeps accumulating`);
  console.log(`  Recovery:     any profit month → withdraw → reset to $10k`);
  console.log(`  Trade filter: 20% reduction (news ±10min + weekend)\n`);

  const { result: p1, nextIdx: p1Next } = simPhase(MONTHS, 0, PHASE1_TARGET);
  const { result: p2, nextIdx: p2Next } = simPhase(MONTHS, p1Next, PHASE2_TARGET);

  console.log("═".repeat(66));
  console.log("  CHALLENGE PHASES");
  console.log("═".repeat(66));
  console.log(`  Phase 1 (+8%): ${p1.passed ? "✅ PASSED" : "❌ FAILED"} | P&L: +${p1.pnlPct}% | ${p1.monthsUsed} month(s) | Max DD: ${p1.maxDD}%`);
  if (p1.failReason) console.log(`    Fail: ${p1.failReason}`);
  console.log(`  Phase 2 (+4%): ${p2.passed ? "✅ PASSED" : "❌ FAILED"} | P&L: +${p2.pnlPct}% | ${p2.monthsUsed} month(s) | Max DD: ${p2.maxDD}%`);
  if (p2.failReason) console.log(`    Fail: ${p2.failReason}`);

  if (!p1.passed || !p2.passed) {
    console.log("\n  ❌ Challenge failed."); process.exit(0);
  }

  for (const account of ACCOUNTS) {
    console.log("\n\n" + "═".repeat(70));
    console.log(`  ${account.name.toUpperCase()} — $${account.challengeFee} challenge fee`);
    console.log("═".repeat(70));

    // Run funded simulation on ALL 74 months from month 0
    // Challenge phases are separate — funded starts from the beginning of the data
    const funded = simFunded(MONTHS, 0, account.accountSize);

    // Full monthly breakdown
    console.log(`\n  ${"Month".padEnd(10)} ${"Open".padStart(9)} ${"Close".padStart(9)} ${"P&L%".padStart(7)} ${"P&L$".padStart(9)} ${"You Get".padStart(9)} ${"DD%".padStart(6)} ${"Next Open".padStart(10)}  Notes`);
    console.log("  " + "─".repeat(82));

    let currentYear = "";
    let yearWithdrawn = 0, yearLoss = 0, yearBlows = 0, yearProfMonths = 0, yearTotalMonths = 0;

    const printYearSummary = (year: string) => {
      if (!year) return;
      const net = yearWithdrawn + yearLoss;
      console.log(`  ${"─".repeat(82)}`);
      console.log(
        `  📅 ${year} YEAR TOTAL`.padEnd(22) +
        `${" ".repeat(20)}` +
        `${yearProfMonths}/${yearTotalMonths} profit months`.padStart(20) +
        `  +$${yearWithdrawn.toFixed(0)} received`.padStart(16) +
        `  $${yearLoss.toFixed(0)} lost`.padStart(14) +
        `  net: ${net >= 0 ? "+" : ""}$${net.toFixed(0)}` +
        (yearBlows > 0 ? `  💥 ${yearBlows} blow(s)` : "")
      );
      console.log(`  ${"─".repeat(82)}`);
    };

    for (const m of funded.monthResults) {
      const year = m.month.slice(0, 4);

      // Print year summary when year changes
      if (year !== currentYear) {
        printYearSummary(currentYear);
        currentYear    = year;
        yearWithdrawn  = 0;
        yearLoss       = 0;
        yearBlows      = 0;
        yearProfMonths = 0;
        yearTotalMonths = 0;
        console.log(`\n  ► ${year}`);
      }

      yearTotalMonths++;
      if (m.withdrawn > 0) { yearWithdrawn += m.withdrawn; yearProfMonths++; }
      if (m.pnlDollar < 0) yearLoss += m.pnlDollar;
      if (m.blown) yearBlows++;

      const sign  = m.pnlPct >= 0 ? "+" : "";
      const flag  = m.blown      ? "💥" :
                    m.pnlPct >= 5  ? "🏆" :
                    m.pnlPct >= 0  ? "  " :
                    m.pnlPct >= -3 ? "⚠️ " : "❌";
      const recv  = m.withdrawn > 0 ? `+$${m.withdrawn.toFixed(0)}` : "$0";
      const dol   = `${m.pnlDollar >= 0 ? "+" : ""}$${m.pnlDollar.toFixed(0)}`;
      const dd    = m.ddFromOrigin > 0 ? `${m.ddFromOrigin}%` : "0%";
      const next  = `$${m.nextBalance.toFixed(0)}`;
      const notes = m.blown    ? ` ← BLOWN 🔄 restart next month`
                  : m.withdrawn > 0 ? ` ✓ reset to $${account.accountSize.toLocaleString()}`
                  : m.dailyHit ? " ⏸ daily DD hit"
                  : "";
      console.log(
        `  ${flag} ${m.month.padEnd(9)}` +
        ` $${m.openBalance.toFixed(0).padStart(8)}` +
        ` $${m.tradeClose.toFixed(0).padStart(8)}` +
        ` ${(sign + m.pnlPct + "%").padStart(7)}` +
        ` ${dol.padStart(9)}` +
        ` ${recv.padStart(9)}` +
        ` ${dd.padStart(6)}` +
        ` ${next.padStart(10)}${notes}`,
      );
    }
    // Print final year summary
    printYearSummary(currentYear);

    const profPct = funded.monthsActive > 0
      ? Math.round(funded.profMonths / funded.monthsActive * 100) : 0;

    console.log(`\n  ── Summary ──────────────────────────────────────────────`);
    console.log(`    Account size:        $${account.accountSize.toLocaleString()}`);
    console.log(`    Active months:       ${funded.monthsActive}`);
    console.log(`    Profitable months:   ${funded.profMonths}/${funded.monthsActive} (${profPct}%)`);
    console.log(`    Avg payout month:    +$${funded.avgWinMonth.toFixed(0)} (your 80%)`);
    console.log(`    Avg loss month:      $${funded.avgLossMonth.toFixed(0)} (account absorbs)`);
    console.log(`    Best payout:         +$${funded.bestMonth.toFixed(0)}`);
    console.log(`    Worst loss:          $${funded.worstMonth.toFixed(0)}`);
    console.log(`    Total received:      $${funded.totalWithdrawn.toFixed(0)}`);
    console.log(`    Account blown:       ${funded.blown ? "💥 YES" : "✅ NO"}`);

    console.log(`\n  ── Monte Carlo (500 runs) ───────────────────────────────`);
    const mc = monteCarlo(account.accountSize);
    console.log(`    Phase 1 pass rate:     ${mc.phase1PassRate}%`);
    console.log(`    Funded reach rate:     ${mc.fundedReachRate}%`);
    console.log(`    Avg attempts needed:   ${mc.attemptsNeeded}`);
    console.log(`    Avg months active:     ${mc.avgMonthsActive}`);
    console.log(`    Account blown rate:    ${mc.blownRate}%`);
    console.log(`    Profitable months:     ${mc.pctMonthsProfit}%`);
    console.log(`    Avg payout month:      +$${mc.avgWinMonth.toFixed(0)}`);
    console.log(`    Avg loss month:        $${mc.avgLossMonth.toFixed(0)}`);
    console.log(`    Avg total received:    $${mc.avgTotalEarned.toFixed(0)}`);

    const totalCost  = account.challengeFee * mc.attemptsNeeded;
    const netProfit  = mc.avgTotalEarned - totalCost;
    const avgMonthly = mc.avgMonthsActive > 0
      ? Math.round(mc.avgTotalEarned / mc.avgMonthsActive) : 0;

    console.log(`\n  ── Economics ────────────────────────────────────────────`);
    console.log(`    Challenge cost:        $${totalCost.toFixed(0)}`);
    console.log(`    Avg total received:    $${mc.avgTotalEarned.toFixed(0)}`);
    console.log(`    Net profit per cycle:  $${netProfit.toFixed(0)}`);
    console.log(`    Avg monthly income:    $${avgMonthly}/month while funded`);
    console.log(`    Restart cost:          $${account.challengeFee} → repeat cycle`);

    const viable = netProfit > 0 && mc.fundedReachRate >= 20;
    console.log(`\n  VERDICT: ${viable ? "✅ VIABLE" : "⚠️  REVIEW NEEDED"}`);
    if (viable) {
      console.log(`    → $${netProfit.toFixed(0)} net per cycle on $${totalCost.toFixed(0)} invested`);
      console.log(`    → $${avgMonthly}/month average while funded`);
      console.log(`    → ${mc.pctMonthsProfit}% of months you receive a payout`);
    }
  }

  console.log("\n\n" + "═".repeat(70));
  console.log("  DD RULES — HOW IT WORKS");
  console.log("═".repeat(70));
  console.log(`
  Daily DD (-3% from day open):
    Each H4 trading session (~12h) resets the daily clock
    If balance drops 3% from that session's open → stop for the day
    Resumes next trading day — account NOT blown

  Blow limit (-8% from original $10k):
    Measured from the ORIGINAL account size always
    Accumulates across consecutive losing months
    Example: Month 1 loses 3% → Month 2 loses 3% → Month 3 loses 2% = 8% → BLOWN

  Profit recovery (resets to $10k):
    Any profitable month → withdraw all profit → account resets to $10k
    The DD clock resets because you're back at $10k
    Example: Month 1 -3%, Month 2 -3%, Month 3 +1% → reset to $10k → DD clock resets

  DD column in the table:
    Shows current accumulated DD % from original $10k
    0% = account is at or above $10k (after reset)
    >0% = account is below $10k, accumulating toward 8% blow limit
  `);
  console.log("═".repeat(70) + "\n");
}

run();
