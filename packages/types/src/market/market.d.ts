import { z } from "zod";
export declare const CandleSchema: z.ZodObject<{
    time: z.ZodString;
    instrument: z.ZodString;
    timeframe: z.ZodString;
    open: z.ZodNumber;
    high: z.ZodNumber;
    low: z.ZodNumber;
    close: z.ZodNumber;
    volume: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    time: string;
    instrument: string;
    timeframe: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}, {
    time: string;
    instrument: string;
    timeframe: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}>;
export type Candle = z.infer<typeof CandleSchema>;
export declare const CalendarEventSchema: z.ZodObject<{
    id: z.ZodString;
    event_time: z.ZodString;
    currency: z.ZodString;
    impact: z.ZodEnum<["low", "medium", "high"]>;
    title: z.ZodString;
    forecast: z.ZodNullable<z.ZodString>;
    previous: z.ZodNullable<z.ZodString>;
    fetched_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    event_time: string;
    currency: string;
    impact: "high" | "low" | "medium";
    title: string;
    forecast: string | null;
    previous: string | null;
    fetched_at: string;
}, {
    id: string;
    event_time: string;
    currency: string;
    impact: "high" | "low" | "medium";
    title: string;
    forecast: string | null;
    previous: string | null;
    fetched_at: string;
}>;
export type CalendarEvent = z.infer<typeof CalendarEventSchema>;
export declare const FOREX_PAIRS: readonly ["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", "NZDUSD", "EURGBP", "EURJPY", "GBPJPY"];
export declare const CRYPTO_PAIRS: readonly ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT"];
export declare const ALL_INSTRUMENTS: readonly ["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", "NZDUSD", "EURGBP", "EURJPY", "GBPJPY", "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT"];
export type Instrument = typeof ALL_INSTRUMENTS[number];
export declare const TIMEFRAMES: readonly ["M5", "M15", "M30", "H1", "H4", "D1", "W1"];
export declare const PIP_VALUE_PER_LOT: Record<string, number>;
export declare const TYPICAL_SPREAD: Record<string, number>;
export declare const ENTRY_BUFFER: Record<string, number>;
