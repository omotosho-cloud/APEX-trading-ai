import { z } from "zod";
export const CandleSchema = z.object({
    time: z.string().datetime(),
    instrument: z.string(),
    timeframe: z.string(),
    open: z.number(),
    high: z.number(),
    low: z.number(),
    close: z.number(),
    volume: z.number(),
});
export const CalendarEventSchema = z.object({
    id: z.string().uuid(),
    event_time: z.string().datetime(),
    currency: z.string(),
    impact: z.enum(["low", "medium", "high"]),
    title: z.string(),
    forecast: z.string().nullable(),
    previous: z.string().nullable(),
    fetched_at: z.string().datetime(),
});
export const FOREX_PAIRS = [
    "EURUSD", "GBPUSD", "USDJPY", "USDCHF",
    "AUDUSD", "USDCAD", "NZDUSD",
    "EURGBP", "EURJPY", "GBPJPY",
];
export const CRYPTO_PAIRS = [
    "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT",
];
export const ALL_INSTRUMENTS = [...FOREX_PAIRS, ...CRYPTO_PAIRS];
export const TIMEFRAMES = ["M5", "M15", "M30", "H1", "H4", "D1", "W1"];
export const PIP_VALUE_PER_LOT = {
    EURUSD: 10.0, GBPUSD: 10.0, USDJPY: 9.09,
    USDCHF: 10.0, AUDUSD: 10.0, USDCAD: 7.69,
    NZDUSD: 10.0, GBPJPY: 9.09, EURJPY: 9.09,
    EURGBP: 10.0,
    BTCUSDT: 1.0, ETHUSDT: 1.0, BNBUSDT: 1.0,
    SOLUSDT: 1.0, XRPUSDT: 1.0,
};
export const TYPICAL_SPREAD = {
    EURUSD: 0.1, GBPUSD: 0.2, USDJPY: 0.1,
    USDCHF: 0.2, AUDUSD: 0.2, USDCAD: 0.3,
    NZDUSD: 0.3, EURGBP: 0.2, EURJPY: 0.3,
    GBPJPY: 0.5, BTCUSDT: 8.0, ETHUSDT: 0.5,
    BNBUSDT: 0.1, SOLUSDT: 0.05, XRPUSDT: 0.001,
};
export const ENTRY_BUFFER = {
    EURUSD: 0.0005, GBPUSD: 0.0005, USDJPY: 0.0005,
    USDCHF: 0.0005, AUDUSD: 0.0005, USDCAD: 0.0005,
    NZDUSD: 0.0005, EURGBP: 0.0005, EURJPY: 0.0010,
    GBPJPY: 0.0010, BTCUSDT: 50.0, ETHUSDT: 5.0,
    BNBUSDT: 0.5, SOLUSDT: 0.1, XRPUSDT: 0.001,
};
//# sourceMappingURL=market.js.map