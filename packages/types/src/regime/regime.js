import { z } from "zod";
export const RegimeSchema = z.enum([
    "trending_bull",
    "trending_bear",
    "ranging",
    "breakout_imminent",
    "volatile",
    "choppy",
]);
export const RegimeStateSchema = z.object({
    time: z.string().datetime(),
    instrument: z.string(),
    timeframe: z.string(),
    regime: RegimeSchema,
    confidence: z.number().min(0).max(100),
    adx: z.number().nullable(),
    hurst: z.number().nullable(),
    atr_ratio: z.number().nullable(),
    bb_bandwidth: z.number().nullable(),
    structure_score: z.number().min(1).max(10).nullable(),
});
export const SessionSchema = z.enum(["london_ny_overlap", "london", "new_york", "tokyo", "closed"]);
export const SESSION_MULTIPLIERS = {
    london_ny_overlap: 1.0,
    london: 0.95,
    new_york: 0.95,
    tokyo: 0.85,
    closed: 0.0,
};
//# sourceMappingURL=regime.js.map