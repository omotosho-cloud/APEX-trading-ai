import "dotenv/config";
import { db } from "./client.js";
import { plans } from "./schema/index.js";

// Prices in Kobo (mirrors PLAN_PRICES in @apex/types)
const PRICES = {
  starter: { monthly: 499900,  quarterly: 1299900,  yearly: 4499900  },
  pro:     { monthly: 999900,  quarterly: 2699900,  yearly: 8999900  },
  elite:   { monthly: 1999900, quarterly: 5299900,  yearly: 17999900 },
} as const;

type PlanName = keyof typeof PRICES;
type Interval = keyof typeof PRICES.starter;

const PLAN_SEED: Array<{
  name: PlanName;
  interval: Interval;
  price_ngn: number;
  features: Record<string, unknown>;
}> = [
  {
    name: "starter", interval: "monthly", price_ngn: PRICES.starter.monthly,
    features: { instruments: ["EURUSD","GBPUSD","USDJPY","USDCHF","AUDUSD","USDCAD","NZDUSD"], timeframes: ["H1","H4","D1"], alerts: ["email"], copy_signals: false },
  },
  {
    name: "starter", interval: "quarterly", price_ngn: PRICES.starter.quarterly,
    features: { instruments: ["EURUSD","GBPUSD","USDJPY","USDCHF","AUDUSD","USDCAD","NZDUSD"], timeframes: ["H1","H4","D1"], alerts: ["email"], copy_signals: false },
  },
  {
    name: "starter", interval: "yearly", price_ngn: PRICES.starter.yearly,
    features: { instruments: ["EURUSD","GBPUSD","USDJPY","USDCHF","AUDUSD","USDCAD","NZDUSD"], timeframes: ["H1","H4","D1"], alerts: ["email"], copy_signals: false },
  },
  {
    name: "pro", interval: "monthly", price_ngn: PRICES.pro.monthly,
    features: { instruments: "all", timeframes: "all", alerts: ["email","telegram"], copy_signals: false },
  },
  {
    name: "pro", interval: "quarterly", price_ngn: PRICES.pro.quarterly,
    features: { instruments: "all", timeframes: "all", alerts: ["email","telegram"], copy_signals: false },
  },
  {
    name: "pro", interval: "yearly", price_ngn: PRICES.pro.yearly,
    features: { instruments: "all", timeframes: "all", alerts: ["email","telegram"], copy_signals: false },
  },
  {
    name: "elite", interval: "monthly", price_ngn: PRICES.elite.monthly,
    features: { instruments: "all", timeframes: "all", alerts: ["email","telegram","push"], copy_signals: true },
  },
  {
    name: "elite", interval: "quarterly", price_ngn: PRICES.elite.quarterly,
    features: { instruments: "all", timeframes: "all", alerts: ["email","telegram","push"], copy_signals: true },
  },
  {
    name: "elite", interval: "yearly", price_ngn: PRICES.elite.yearly,
    features: { instruments: "all", timeframes: "all", alerts: ["email","telegram","push"], copy_signals: true },
  },
];

async function seed() {
  console.log("Seeding plans...");
  await db.insert(plans).values(PLAN_SEED).onConflictDoNothing();
  console.log(`Seeded ${PLAN_SEED.length} plans.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
