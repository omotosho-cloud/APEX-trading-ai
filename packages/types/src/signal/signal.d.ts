import { z } from "zod";
export declare const DirectionSchema: z.ZodEnum<["buy", "sell", "neutral"]>;
export type Direction = z.infer<typeof DirectionSchema>;
export declare const TimeframeSchema: z.ZodEnum<["M5", "M15", "M30", "H1", "H4", "D1", "W1"]>;
export type Timeframe = z.infer<typeof TimeframeSchema>;
export declare const SignalStatusSchema: z.ZodEnum<["ACTIVE", "EXPIRED", "FILLED"]>;
export type SignalStatus = z.infer<typeof SignalStatusSchema>;
export declare const QualityTagSchema: z.ZodEnum<["HIGH_QUALITY", "LOW_CONFIDENCE", "EVENT_RISK", "SANITY_CAP_APPLIED", "PREMIUM"]>;
export type QualityTag = z.infer<typeof QualityTagSchema>;
export declare const ExpertVoteSchema: z.ZodObject<{
    direction: z.ZodEnum<["buy", "sell", "neutral"]>;
    confidence: z.ZodNumber;
    reasoning: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    confidence: number;
    direction: "buy" | "sell" | "neutral";
    reasoning?: string | undefined;
}, {
    confidence: number;
    direction: "buy" | "sell" | "neutral";
    reasoning?: string | undefined;
}>;
export type ExpertVote = z.infer<typeof ExpertVoteSchema>;
export declare const ExpertVotesSchema: z.ZodObject<{
    technical: z.ZodObject<{
        direction: z.ZodEnum<["buy", "sell", "neutral"]>;
        confidence: z.ZodNumber;
        reasoning: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        confidence: number;
        direction: "buy" | "sell" | "neutral";
        reasoning?: string | undefined;
    }, {
        confidence: number;
        direction: "buy" | "sell" | "neutral";
        reasoning?: string | undefined;
    }>;
    smart_money: z.ZodObject<{
        direction: z.ZodEnum<["buy", "sell", "neutral"]>;
        confidence: z.ZodNumber;
        reasoning: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        confidence: number;
        direction: "buy" | "sell" | "neutral";
        reasoning?: string | undefined;
    }, {
        confidence: number;
        direction: "buy" | "sell" | "neutral";
        reasoning?: string | undefined;
    }>;
    sentiment: z.ZodObject<{
        direction: z.ZodEnum<["buy", "sell", "neutral"]>;
        confidence: z.ZodNumber;
        reasoning: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        confidence: number;
        direction: "buy" | "sell" | "neutral";
        reasoning?: string | undefined;
    }, {
        confidence: number;
        direction: "buy" | "sell" | "neutral";
        reasoning?: string | undefined;
    }>;
    macro: z.ZodObject<{
        direction: z.ZodEnum<["buy", "sell", "neutral"]>;
        confidence: z.ZodNumber;
        reasoning: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        confidence: number;
        direction: "buy" | "sell" | "neutral";
        reasoning?: string | undefined;
    }, {
        confidence: number;
        direction: "buy" | "sell" | "neutral";
        reasoning?: string | undefined;
    }>;
    quant: z.ZodObject<{
        direction: z.ZodEnum<["buy", "sell", "neutral"]>;
        confidence: z.ZodNumber;
        reasoning: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        confidence: number;
        direction: "buy" | "sell" | "neutral";
        reasoning?: string | undefined;
    }, {
        confidence: number;
        direction: "buy" | "sell" | "neutral";
        reasoning?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    technical: {
        confidence: number;
        direction: "buy" | "sell" | "neutral";
        reasoning?: string | undefined;
    };
    smart_money: {
        confidence: number;
        direction: "buy" | "sell" | "neutral";
        reasoning?: string | undefined;
    };
    sentiment: {
        confidence: number;
        direction: "buy" | "sell" | "neutral";
        reasoning?: string | undefined;
    };
    macro: {
        confidence: number;
        direction: "buy" | "sell" | "neutral";
        reasoning?: string | undefined;
    };
    quant: {
        confidence: number;
        direction: "buy" | "sell" | "neutral";
        reasoning?: string | undefined;
    };
}, {
    technical: {
        confidence: number;
        direction: "buy" | "sell" | "neutral";
        reasoning?: string | undefined;
    };
    smart_money: {
        confidence: number;
        direction: "buy" | "sell" | "neutral";
        reasoning?: string | undefined;
    };
    sentiment: {
        confidence: number;
        direction: "buy" | "sell" | "neutral";
        reasoning?: string | undefined;
    };
    macro: {
        confidence: number;
        direction: "buy" | "sell" | "neutral";
        reasoning?: string | undefined;
    };
    quant: {
        confidence: number;
        direction: "buy" | "sell" | "neutral";
        reasoning?: string | undefined;
    };
}>;
export type ExpertVotes = z.infer<typeof ExpertVotesSchema>;
export declare const SanityCheckSchema: z.ZodObject<{
    divergence_warning: z.ZodBoolean;
    distribution_signal: z.ZodEnum<["bullish", "bearish", "neutral"]>;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    divergence_warning: boolean;
    distribution_signal: "neutral" | "bullish" | "bearish";
    reason: string;
}, {
    divergence_warning: boolean;
    distribution_signal: "neutral" | "bullish" | "bearish";
    reason: string;
}>;
export type SanityCheck = z.infer<typeof SanityCheckSchema>;
export declare const SignalSchema: z.ZodObject<{
    id: z.ZodString;
    instrument: z.ZodString;
    timeframe: z.ZodEnum<["M5", "M15", "M30", "H1", "H4", "D1", "W1"]>;
    direction: z.ZodEnum<["buy", "sell", "neutral"]>;
    confidence: z.ZodNumber;
    quality_tag: z.ZodNullable<z.ZodEnum<["HIGH_QUALITY", "LOW_CONFIDENCE", "EVENT_RISK", "SANITY_CAP_APPLIED", "PREMIUM"]>>;
    regime: z.ZodString;
    entry_price: z.ZodNumber;
    entry_buffer: z.ZodNumber;
    sl_price: z.ZodNumber;
    tp1_price: z.ZodNumber;
    tp2_price: z.ZodNumber;
    tp3_price: z.ZodNullable<z.ZodNumber>;
    atr_value: z.ZodNumber;
    rr_ratio: z.ZodNumber;
    expert_votes: z.ZodObject<{
        technical: z.ZodObject<{
            direction: z.ZodEnum<["buy", "sell", "neutral"]>;
            confidence: z.ZodNumber;
            reasoning: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            confidence: number;
            direction: "buy" | "sell" | "neutral";
            reasoning?: string | undefined;
        }, {
            confidence: number;
            direction: "buy" | "sell" | "neutral";
            reasoning?: string | undefined;
        }>;
        smart_money: z.ZodObject<{
            direction: z.ZodEnum<["buy", "sell", "neutral"]>;
            confidence: z.ZodNumber;
            reasoning: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            confidence: number;
            direction: "buy" | "sell" | "neutral";
            reasoning?: string | undefined;
        }, {
            confidence: number;
            direction: "buy" | "sell" | "neutral";
            reasoning?: string | undefined;
        }>;
        sentiment: z.ZodObject<{
            direction: z.ZodEnum<["buy", "sell", "neutral"]>;
            confidence: z.ZodNumber;
            reasoning: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            confidence: number;
            direction: "buy" | "sell" | "neutral";
            reasoning?: string | undefined;
        }, {
            confidence: number;
            direction: "buy" | "sell" | "neutral";
            reasoning?: string | undefined;
        }>;
        macro: z.ZodObject<{
            direction: z.ZodEnum<["buy", "sell", "neutral"]>;
            confidence: z.ZodNumber;
            reasoning: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            confidence: number;
            direction: "buy" | "sell" | "neutral";
            reasoning?: string | undefined;
        }, {
            confidence: number;
            direction: "buy" | "sell" | "neutral";
            reasoning?: string | undefined;
        }>;
        quant: z.ZodObject<{
            direction: z.ZodEnum<["buy", "sell", "neutral"]>;
            confidence: z.ZodNumber;
            reasoning: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            confidence: number;
            direction: "buy" | "sell" | "neutral";
            reasoning?: string | undefined;
        }, {
            confidence: number;
            direction: "buy" | "sell" | "neutral";
            reasoning?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        technical: {
            confidence: number;
            direction: "buy" | "sell" | "neutral";
            reasoning?: string | undefined;
        };
        smart_money: {
            confidence: number;
            direction: "buy" | "sell" | "neutral";
            reasoning?: string | undefined;
        };
        sentiment: {
            confidence: number;
            direction: "buy" | "sell" | "neutral";
            reasoning?: string | undefined;
        };
        macro: {
            confidence: number;
            direction: "buy" | "sell" | "neutral";
            reasoning?: string | undefined;
        };
        quant: {
            confidence: number;
            direction: "buy" | "sell" | "neutral";
            reasoning?: string | undefined;
        };
    }, {
        technical: {
            confidence: number;
            direction: "buy" | "sell" | "neutral";
            reasoning?: string | undefined;
        };
        smart_money: {
            confidence: number;
            direction: "buy" | "sell" | "neutral";
            reasoning?: string | undefined;
        };
        sentiment: {
            confidence: number;
            direction: "buy" | "sell" | "neutral";
            reasoning?: string | undefined;
        };
        macro: {
            confidence: number;
            direction: "buy" | "sell" | "neutral";
            reasoning?: string | undefined;
        };
        quant: {
            confidence: number;
            direction: "buy" | "sell" | "neutral";
            reasoning?: string | undefined;
        };
    }>;
    gating_weights: z.ZodRecord<z.ZodString, z.ZodNumber>;
    sanity_check: z.ZodNullable<z.ZodObject<{
        divergence_warning: z.ZodBoolean;
        distribution_signal: z.ZodEnum<["bullish", "bearish", "neutral"]>;
        reason: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        divergence_warning: boolean;
        distribution_signal: "neutral" | "bullish" | "bearish";
        reason: string;
    }, {
        divergence_warning: boolean;
        distribution_signal: "neutral" | "bullish" | "bearish";
        reason: string;
    }>>;
    ai_narrative: z.ZodNullable<z.ZodString>;
    session: z.ZodNullable<z.ZodString>;
    status: z.ZodEnum<["ACTIVE", "EXPIRED", "FILLED"]>;
    is_active: z.ZodBoolean;
    fired_at: z.ZodString;
    valid_until: z.ZodString;
    filled_at: z.ZodNullable<z.ZodString>;
    expires_at: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    instrument: string;
    timeframe: "M5" | "M15" | "M30" | "H1" | "H4" | "D1" | "W1";
    regime: string;
    confidence: number;
    id: string;
    is_active: boolean;
    status: "ACTIVE" | "EXPIRED" | "FILLED";
    direction: "buy" | "sell" | "neutral";
    quality_tag: "HIGH_QUALITY" | "LOW_CONFIDENCE" | "EVENT_RISK" | "SANITY_CAP_APPLIED" | "PREMIUM" | null;
    entry_price: number;
    entry_buffer: number;
    sl_price: number;
    tp1_price: number;
    tp2_price: number;
    tp3_price: number | null;
    atr_value: number;
    rr_ratio: number;
    expert_votes: {
        technical: {
            confidence: number;
            direction: "buy" | "sell" | "neutral";
            reasoning?: string | undefined;
        };
        smart_money: {
            confidence: number;
            direction: "buy" | "sell" | "neutral";
            reasoning?: string | undefined;
        };
        sentiment: {
            confidence: number;
            direction: "buy" | "sell" | "neutral";
            reasoning?: string | undefined;
        };
        macro: {
            confidence: number;
            direction: "buy" | "sell" | "neutral";
            reasoning?: string | undefined;
        };
        quant: {
            confidence: number;
            direction: "buy" | "sell" | "neutral";
            reasoning?: string | undefined;
        };
    };
    gating_weights: Record<string, number>;
    sanity_check: {
        divergence_warning: boolean;
        distribution_signal: "neutral" | "bullish" | "bearish";
        reason: string;
    } | null;
    ai_narrative: string | null;
    session: string | null;
    fired_at: string;
    valid_until: string;
    filled_at: string | null;
    expires_at: string | null;
}, {
    instrument: string;
    timeframe: "M5" | "M15" | "M30" | "H1" | "H4" | "D1" | "W1";
    regime: string;
    confidence: number;
    id: string;
    is_active: boolean;
    status: "ACTIVE" | "EXPIRED" | "FILLED";
    direction: "buy" | "sell" | "neutral";
    quality_tag: "HIGH_QUALITY" | "LOW_CONFIDENCE" | "EVENT_RISK" | "SANITY_CAP_APPLIED" | "PREMIUM" | null;
    entry_price: number;
    entry_buffer: number;
    sl_price: number;
    tp1_price: number;
    tp2_price: number;
    tp3_price: number | null;
    atr_value: number;
    rr_ratio: number;
    expert_votes: {
        technical: {
            confidence: number;
            direction: "buy" | "sell" | "neutral";
            reasoning?: string | undefined;
        };
        smart_money: {
            confidence: number;
            direction: "buy" | "sell" | "neutral";
            reasoning?: string | undefined;
        };
        sentiment: {
            confidence: number;
            direction: "buy" | "sell" | "neutral";
            reasoning?: string | undefined;
        };
        macro: {
            confidence: number;
            direction: "buy" | "sell" | "neutral";
            reasoning?: string | undefined;
        };
        quant: {
            confidence: number;
            direction: "buy" | "sell" | "neutral";
            reasoning?: string | undefined;
        };
    };
    gating_weights: Record<string, number>;
    sanity_check: {
        divergence_warning: boolean;
        distribution_signal: "neutral" | "bullish" | "bearish";
        reason: string;
    } | null;
    ai_narrative: string | null;
    session: string | null;
    fired_at: string;
    valid_until: string;
    filled_at: string | null;
    expires_at: string | null;
}>;
export type Signal = z.infer<typeof SignalSchema>;
export declare const OutcomeSchema: z.ZodEnum<["tp1", "tp2", "tp3", "sl", "expired"]>;
export type Outcome = z.infer<typeof OutcomeSchema>;
export declare const SignalOutcomeSchema: z.ZodObject<{
    id: z.ZodString;
    signal_id: z.ZodString;
    outcome: z.ZodEnum<["tp1", "tp2", "tp3", "sl", "expired"]>;
    exit_price: z.ZodNullable<z.ZodNumber>;
    pips_gained: z.ZodNullable<z.ZodNumber>;
    rr_achieved: z.ZodNullable<z.ZodNumber>;
    duration_mins: z.ZodNullable<z.ZodNumber>;
    regime_snapshot: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    expiry_reason: z.ZodNullable<z.ZodString>;
    slippage_pips: z.ZodNullable<z.ZodNumber>;
    closed_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    signal_id: string;
    outcome: "tp1" | "tp2" | "tp3" | "sl" | "expired";
    exit_price: number | null;
    pips_gained: number | null;
    rr_achieved: number | null;
    duration_mins: number | null;
    regime_snapshot: Record<string, unknown>;
    expiry_reason: string | null;
    slippage_pips: number | null;
    closed_at: string;
}, {
    id: string;
    signal_id: string;
    outcome: "tp1" | "tp2" | "tp3" | "sl" | "expired";
    exit_price: number | null;
    pips_gained: number | null;
    rr_achieved: number | null;
    duration_mins: number | null;
    regime_snapshot: Record<string, unknown>;
    expiry_reason: string | null;
    slippage_pips: number | null;
    closed_at: string;
}>;
export type SignalOutcome = z.infer<typeof SignalOutcomeSchema>;
