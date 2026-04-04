/**
 * Monthly Risk Guard
 *
 * Implements the -3% monthly loss limit rule from the backtest analysis.
 * Queries closed signal outcomes for the current calendar month and
 * calculates realised P&L as a % of account equity.
 *
 * If monthly P&L <= -MONTHLY_LOSS_CAP_PCT → block all new signals for the month.
 * Resets automatically on the 1st of each month.
 *
 * Used by: signal-pipeline.ts (step 0 — before any computation)
 */

import { db } from "../../db/client.js";
import { signalOutcomes, signals } from "../../db/schema/index.js";
import { and, gte, sql } from "drizzle-orm";

const MONTHLY_LOSS_CAP_PCT = parseFloat(
  process.env.MONTHLY_LOSS_CAP_PCT ?? "3.0",  // default -3%
);

const RISK_PER_TRADE_PCT = parseFloat(
  process.env.RISK_PER_TRADE_PCT ?? "1.0",    // default 1% risk per trade
);

type GuardResult = {
  allowed:       boolean;
  monthlyPnlPct: number;   // current month realised P&L %
  tradesThisMonth: number;
  reason:        string | null;
};

/**
 * Returns the start of the current UTC calendar month as an ISO string.
 */
function monthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Calculates realised monthly P&L % from closed signal outcomes this month.
 *
 * P&L per trade = rr_achieved × RISK_PER_TRADE_PCT  (win)
 *               = -RISK_PER_TRADE_PCT                (loss / sl)
 *               = -0.2 × RISK_PER_TRADE_PCT          (expired)
 */
export async function checkMonthlyRiskGuard(): Promise<GuardResult> {
  const start = monthStart();

  // Join signal_outcomes with signals to get outcome + rr_achieved this month
  const rows = await db
    .select({
      outcome:     signalOutcomes.outcome,
      rr_achieved: signalOutcomes.rr_achieved,
    })
    .from(signalOutcomes)
    .where(gte(signalOutcomes.closed_at, start));

  if (rows.length === 0) {
    return { allowed: true, monthlyPnlPct: 0, tradesThisMonth: 0, reason: null };
  }

  // Calculate realised P&L in R units
  let totalPnlR = 0;
  for (const row of rows) {
    const outcome = row.outcome;
    const rr      = parseFloat(row.rr_achieved ?? "0");

    if (outcome === "TP1" || outcome === "TP2" || outcome === "TP3") {
      totalPnlR += rr > 0 ? rr : 1; // use actual RR achieved, fallback to 1R
    } else if (outcome === "SL") {
      totalPnlR -= 1;
    } else {
      // expired / unknown — small time cost
      totalPnlR -= 0.2;
    }
  }

  // Convert R to % using risk per trade
  const monthlyPnlPct = Math.round(totalPnlR * RISK_PER_TRADE_PCT * 100) / 100;
  const breached      = monthlyPnlPct <= -MONTHLY_LOSS_CAP_PCT;

  return {
    allowed:         !breached,
    monthlyPnlPct,
    tradesThisMonth: rows.length,
    reason:          breached
      ? `Monthly loss cap hit: ${monthlyPnlPct}% (limit -${MONTHLY_LOSS_CAP_PCT}%). No new signals until ${new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 1)).toISOString().slice(0, 10)}.`
      : null,
  };
}
