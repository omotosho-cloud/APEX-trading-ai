-- PostgreSQL app tables migration
-- Run this against DATABASE_URL

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email               TEXT UNIQUE NOT NULL,
    full_name           TEXT,
    account_size        DECIMAL(12,2),
    risk_pct            DECIMAL(4,2) DEFAULT 1.0,
    preferred_pairs     TEXT[] DEFAULT '{}',
    subscription_status TEXT DEFAULT 'trial' NOT NULL,
    subscription_end    TIMESTAMPTZ,
    telegram_chat_id    BIGINT,
    created_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS plans (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    price_ngn   INTEGER NOT NULL,
    interval    TEXT NOT NULL,
    features    JSONB NOT NULL,
    is_active   BOOLEAN DEFAULT TRUE NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id),
    plan_id         UUID REFERENCES plans(id),
    paystack_ref    TEXT UNIQUE,
    amount_kobo     INTEGER NOT NULL,
    status          TEXT DEFAULT 'pending' NOT NULL,
    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS signals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instrument      TEXT NOT NULL,
    timeframe       TEXT NOT NULL,
    direction       TEXT NOT NULL,
    confidence      SMALLINT NOT NULL,
    quality_tag     TEXT,
    regime          TEXT NOT NULL,
    entry_price     DECIMAL(18,8) NOT NULL,
    entry_buffer    DECIMAL(18,8) NOT NULL,
    sl_price        DECIMAL(18,8) NOT NULL,
    tp1_price       DECIMAL(18,8) NOT NULL,
    tp2_price       DECIMAL(18,8) NOT NULL,
    tp3_price       DECIMAL(18,8),
    atr_value       DECIMAL(18,8) NOT NULL,
    rr_ratio        DECIMAL(4,2) NOT NULL,
    expert_votes    JSONB NOT NULL,
    gating_weights  JSONB NOT NULL,
    sanity_check    JSONB,
    ai_narrative    TEXT,
    session         TEXT,
    status          TEXT DEFAULT 'ACTIVE' NOT NULL,
    is_active       BOOLEAN DEFAULT TRUE NOT NULL,
    fired_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    valid_until     TIMESTAMPTZ NOT NULL,
    filled_at       TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS signals_instrument_timeframe_fired_at_idx ON signals (instrument, timeframe, fired_at DESC);
CREATE INDEX IF NOT EXISTS signals_is_active_fired_at_idx ON signals (is_active, fired_at DESC);
CREATE INDEX IF NOT EXISTS signals_status_valid_until_idx ON signals (status, valid_until);

CREATE TABLE IF NOT EXISTS signal_outcomes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_id       UUID REFERENCES signals(id),
    outcome         TEXT NOT NULL,
    exit_price      DECIMAL(18,8),
    pips_gained     DECIMAL(8,2),
    rr_achieved     DECIMAL(4,2),
    duration_mins   INTEGER,
    regime_snapshot JSONB NOT NULL,
    expiry_reason   TEXT,
    slippage_pips   DECIMAL(8,2),
    closed_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS expert_accuracy (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expert_name     TEXT NOT NULL,
    instrument      TEXT NOT NULL,
    timeframe       TEXT NOT NULL,
    regime          TEXT NOT NULL,
    window_size     SMALLINT DEFAULT 50,
    correct_count   SMALLINT DEFAULT 0,
    total_count     SMALLINT DEFAULT 0,
    accuracy_pct    DECIMAL(5,2),
    last_updated    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (expert_name, instrument, timeframe, regime)
);

CREATE TABLE IF NOT EXISTS user_watchlist (
    user_id     UUID REFERENCES users(id),
    instrument  TEXT NOT NULL,
    added_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (user_id, instrument)
);

CREATE TABLE IF NOT EXISTS copy_subscriptions (
    follower_id UUID REFERENCES users(id),
    leader_id   UUID REFERENCES users(id),
    is_active   BOOLEAN DEFAULT TRUE NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (follower_id, leader_id)
);

CREATE TABLE IF NOT EXISTS calendar_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_time  TIMESTAMPTZ NOT NULL,
    currency    TEXT NOT NULL,
    impact      TEXT NOT NULL,
    title       TEXT NOT NULL,
    forecast    TEXT,
    previous    TEXT,
    fetched_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS calendar_events_event_time_impact_idx ON calendar_events (event_time, impact);
