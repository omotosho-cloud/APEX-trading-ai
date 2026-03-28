-- Candles + regime_states migration
-- Works on standard PostgreSQL (Supabase free tier).
-- If TimescaleDB extension is available, run create_hypertable manually after.

CREATE TABLE IF NOT EXISTS candles (
    time        TIMESTAMPTZ NOT NULL,
    instrument  VARCHAR(12) NOT NULL,
    timeframe   VARCHAR(4) NOT NULL,
    open        DECIMAL(18,8) NOT NULL,
    high        DECIMAL(18,8) NOT NULL,
    low         DECIMAL(18,8) NOT NULL,
    close       DECIMAL(18,8) NOT NULL,
    volume      DECIMAL(18,8) NOT NULL,
    PRIMARY KEY (time, instrument, timeframe)
);

CREATE INDEX IF NOT EXISTS candles_instrument_timeframe_time_idx
    ON candles (instrument, timeframe, time DESC);

CREATE TABLE IF NOT EXISTS regime_states (
    time            TIMESTAMPTZ NOT NULL,
    instrument      VARCHAR(12) NOT NULL,
    timeframe       VARCHAR(4) NOT NULL,
    regime          VARCHAR(32) NOT NULL,
    confidence      SMALLINT NOT NULL,
    adx             DECIMAL(6,2),
    hurst           DECIMAL(4,3),
    atr_ratio       DECIMAL(6,3),
    bb_bandwidth    DECIMAL(8,5),
    structure_score SMALLINT,
    PRIMARY KEY (time, instrument, timeframe)
);
