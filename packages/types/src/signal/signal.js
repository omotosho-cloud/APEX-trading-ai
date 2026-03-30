import { z } from "zod";
export const DirectionSchema = z.enum(["buy", "sell", "neutral"]);
export const TimeframeSchema = z.enum(["M5", "M15", "M30", "H1", "H4", "D1", "W1"]);
export const SignalStatusSchema = z.enum(["ACTIVE", "EXPIRED", "FILLED"]);
export const QualityTagSchema = z.enum([
    "HIGH_QUALITY",
    "LOW_CONFIDENCE",
    "EVENT_RISK",
    "SANITY_CAP_APPLIED",
    "PREMIUM",
]);
export const ExpertVoteSchema = z.object({
    direction: DirectionSchema,
    confidence: z.number().min(0).max(100),
    reasoning: z.string().optional(),
});
export const ExpertVotesSchema = z.object({
    technical: ExpertVoteSchema,
    smart_money: ExpertVoteSchema,
    sentiment: ExpertVoteSchema,
    macro: ExpertVoteSchema,
    quant: ExpertVoteSchema,
});
export const SanityCheckSchema = z.object({
    divergence_warning: z.boolean(),
    distribution_signal: z.enum(["bullish", "bearish", "neutral"]),
    reason: z.string(),
});
export const SignalSchema = z.object({
    id: z.string().uuid(),
    instrument: z.string(),
    timeframe: TimeframeSchema,
    direction: DirectionSchema,
    confidence: z.number().min(0).max(100),
    quality_tag: QualityTagSchema.nullable(),
    regime: z.string(),
    entry_price: z.number(),
    entry_buffer: z.number(),
    sl_price: z.number(),
    tp1_price: z.number(),
    tp2_price: z.number(),
    tp3_price: z.number().nullable(),
    atr_value: z.number(),
    rr_ratio: z.number(),
    expert_votes: ExpertVotesSchema,
    gating_weights: z.record(z.string(), z.number()),
    sanity_check: SanityCheckSchema.nullable(),
    ai_narrative: z.string().nullable(),
    session: z.string().nullable(),
    status: SignalStatusSchema,
    is_active: z.boolean(),
    fired_at: z.string().datetime(),
    valid_until: z.string().datetime(),
    filled_at: z.string().datetime().nullable(),
    expires_at: z.string().datetime().nullable(),
});
export const OutcomeSchema = z.enum(["tp1", "tp2", "tp3", "sl", "expired"]);
export const SignalOutcomeSchema = z.object({
    id: z.string().uuid(),
    signal_id: z.string().uuid(),
    outcome: OutcomeSchema,
    exit_price: z.number().nullable(),
    pips_gained: z.number().nullable(),
    rr_achieved: z.number().nullable(),
    duration_mins: z.number().nullable(),
    regime_snapshot: z.record(z.string(), z.unknown()),
    expiry_reason: z.string().nullable(),
    slippage_pips: z.number().nullable(),
    closed_at: z.string().datetime(),
});
//# sourceMappingURL=signal.js.map