import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  smallint,
  decimal,
  jsonb,
  primaryKey,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { timestamptz } from "../helpers.js";

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").unique().notNull(),
  full_name: text("full_name"),
  account_size: decimal("account_size", { precision: 12, scale: 2 }),
  risk_pct: decimal("risk_pct", { precision: 4, scale: 2 }).default("1.0"),
  preferred_pairs: text("preferred_pairs").array().default(sql`'{}'`),
  subscription_status: text("subscription_status").default("trial").notNull(),
  subscription_end: timestamptz("subscription_end"),
  telegram_chat_id: decimal("telegram_chat_id", { precision: 20, scale: 0 }),
  created_at: timestamptz("created_at").default(sql`NOW()`).notNull(),
  updated_at: timestamptz("updated_at").default(sql`NOW()`).notNull(),
});

// ─── Plans ────────────────────────────────────────────────────────────────────

export const plans = pgTable("plans", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  price_ngn: integer("price_ngn").notNull(),
  interval: text("interval").notNull(),
  features: jsonb("features").notNull(),
  is_active: boolean("is_active").default(true).notNull(),
});

// ─── Payments ─────────────────────────────────────────────────────────────────

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid("user_id").references(() => users.id),
  plan_id: uuid("plan_id").references(() => plans.id),
  paystack_ref: text("paystack_ref").unique(),
  amount_kobo: integer("amount_kobo").notNull(),
  status: text("status").default("pending").notNull(),
  paid_at: timestamptz("paid_at"),
  created_at: timestamptz("created_at").default(sql`NOW()`).notNull(),
});

// ─── Signals ──────────────────────────────────────────────────────────────────

export const signals = pgTable(
  "signals",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    instrument: text("instrument").notNull(),
    timeframe: text("timeframe").notNull(),
    direction: text("direction").notNull(),
    confidence: smallint("confidence").notNull(),
    quality_tag: text("quality_tag"),
    regime: text("regime").notNull(),
    entry_price: decimal("entry_price", { precision: 18, scale: 8 }).notNull(),
    entry_buffer: decimal("entry_buffer", { precision: 18, scale: 8 }).notNull(),
    sl_price: decimal("sl_price", { precision: 18, scale: 8 }).notNull(),
    tp1_price: decimal("tp1_price", { precision: 18, scale: 8 }).notNull(),
    tp2_price: decimal("tp2_price", { precision: 18, scale: 8 }).notNull(),
    tp3_price: decimal("tp3_price", { precision: 18, scale: 8 }),
    atr_value: decimal("atr_value", { precision: 18, scale: 8 }).notNull(),
    rr_ratio: decimal("rr_ratio", { precision: 4, scale: 2 }).notNull(),
    expert_votes: jsonb("expert_votes").notNull(),
    gating_weights: jsonb("gating_weights").notNull(),
    sanity_check: jsonb("sanity_check"),
    ai_narrative: text("ai_narrative"),
    session: text("session"),
    status: text("status").default("ACTIVE").notNull(),
    is_active: boolean("is_active").default(true).notNull(),
    fired_at: timestamptz("fired_at").default(sql`NOW()`).notNull(),
    valid_until: timestamptz("valid_until").notNull(),
    filled_at: timestamptz("filled_at"),
    expires_at: timestamptz("expires_at"),
  },
  (t) => ({
    instrumentTimeframeIdx: index("signals_instrument_timeframe_fired_at_idx").on(
      t.instrument,
      t.timeframe,
      t.fired_at,
    ),
    activeIdx: index("signals_is_active_fired_at_idx").on(t.is_active, t.fired_at),
    statusExpiryIdx: index("signals_status_valid_until_idx").on(t.status, t.valid_until),
  }),
);

// ─── Signal Outcomes ──────────────────────────────────────────────────────────

export const signalOutcomes = pgTable("signal_outcomes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  signal_id: uuid("signal_id").references(() => signals.id),
  outcome: text("outcome").notNull(),
  exit_price: decimal("exit_price", { precision: 18, scale: 8 }),
  pips_gained: decimal("pips_gained", { precision: 8, scale: 2 }),
  rr_achieved: decimal("rr_achieved", { precision: 4, scale: 2 }),
  duration_mins: integer("duration_mins"),
  regime_snapshot: jsonb("regime_snapshot").notNull(),
  expiry_reason: text("expiry_reason"),
  slippage_pips: decimal("slippage_pips", { precision: 8, scale: 2 }),
  closed_at: timestamptz("closed_at").default(sql`NOW()`).notNull(),
});

// ─── Expert Accuracy ──────────────────────────────────────────────────────────

export const expertAccuracy = pgTable(
  "expert_accuracy",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    expert_name: text("expert_name").notNull(),
    instrument: text("instrument").notNull(),
    timeframe: text("timeframe").notNull(),
    regime: text("regime").notNull(),
    window_size: smallint("window_size").default(50),
    correct_count: smallint("correct_count").default(0),
    total_count: smallint("total_count").default(0),
    accuracy_pct: decimal("accuracy_pct", { precision: 5, scale: 2 }),
    last_updated: timestamptz("last_updated").default(sql`NOW()`).notNull(),
  },
  (t) => ({
    uniqueExpert: unique().on(t.expert_name, t.instrument, t.timeframe, t.regime),
  }),
);

// ─── User Watchlist ───────────────────────────────────────────────────────────

export const userWatchlist = pgTable(
  "user_watchlist",
  {
    user_id: uuid("user_id").references(() => users.id),
    instrument: text("instrument").notNull(),
    added_at: timestamptz("added_at").default(sql`NOW()`).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.user_id, t.instrument] }),
  }),
);

// ─── Copy Subscriptions ───────────────────────────────────────────────────────

export const copySubscriptions = pgTable(
  "copy_subscriptions",
  {
    follower_id: uuid("follower_id").references(() => users.id),
    leader_id: uuid("leader_id").references(() => users.id),
    is_active: boolean("is_active").default(true).notNull(),
    created_at: timestamptz("created_at").default(sql`NOW()`).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.follower_id, t.leader_id] }),
  }),
);

// ─── Calendar Events ──────────────────────────────────────────────────────────

export const calendarEvents = pgTable(
  "calendar_events",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    event_time: timestamptz("event_time").notNull(),
    currency: text("currency").notNull(),
    impact: text("impact").notNull(),
    title: text("title").notNull(),
    forecast: text("forecast"),
    previous: text("previous"),
    fetched_at: timestamptz("fetched_at").default(sql`NOW()`).notNull(),
  },
  (t) => ({
    eventTimeImpactIdx: index("calendar_events_event_time_impact_idx").on(
      t.event_time,
      t.impact,
    ),
  }),
);
