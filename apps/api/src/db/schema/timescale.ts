import {
  pgTable,
  varchar,
  decimal,
  smallint,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { timestamptz } from "../helpers.js";

export const candles = pgTable(
  "candles",
  {
    time: timestamptz("time").notNull(),
    instrument: varchar("instrument", { length: 12 }).notNull(),
    timeframe: varchar("timeframe", { length: 4 }).notNull(),
    open: decimal("open", { precision: 18, scale: 8 }).notNull(),
    high: decimal("high", { precision: 18, scale: 8 }).notNull(),
    low: decimal("low", { precision: 18, scale: 8 }).notNull(),
    close: decimal("close", { precision: 18, scale: 8 }).notNull(),
    volume: decimal("volume", { precision: 18, scale: 8 }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.time, t.instrument, t.timeframe] }),
    instrumentTimeframeIdx: index("candles_instrument_timeframe_time_idx").on(
      t.instrument,
      t.timeframe,
      t.time,
    ),
  }),
);

export const regimeStates = pgTable(
  "regime_states",
  {
    time: timestamptz("time").notNull(),
    instrument: varchar("instrument", { length: 12 }).notNull(),
    timeframe: varchar("timeframe", { length: 4 }).notNull(),
    regime: varchar("regime", { length: 32 }).notNull(),
    confidence: smallint("confidence").notNull(),
    adx: decimal("adx", { precision: 6, scale: 2 }),
    hurst: decimal("hurst", { precision: 4, scale: 3 }),
    atr_ratio: decimal("atr_ratio", { precision: 6, scale: 3 }),
    bb_bandwidth: decimal("bb_bandwidth", { precision: 8, scale: 5 }),
    structure_score: smallint("structure_score"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.time, t.instrument, t.timeframe] }),
  }),
);
