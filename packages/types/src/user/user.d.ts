import { z } from "zod";
export declare const SubscriptionStatusSchema: z.ZodEnum<["trial", "active", "expired"]>;
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;
export declare const UserSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    full_name: z.ZodNullable<z.ZodString>;
    account_size: z.ZodNullable<z.ZodNumber>;
    risk_pct: z.ZodDefault<z.ZodNumber>;
    preferred_pairs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    subscription_status: z.ZodDefault<z.ZodEnum<["trial", "active", "expired"]>>;
    subscription_end: z.ZodNullable<z.ZodString>;
    telegram_chat_id: z.ZodNullable<z.ZodNumber>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    email: string;
    full_name: string | null;
    account_size: number | null;
    risk_pct: number;
    preferred_pairs: string[];
    subscription_status: "trial" | "expired" | "active";
    subscription_end: string | null;
    telegram_chat_id: number | null;
    created_at: string;
    updated_at: string;
}, {
    id: string;
    email: string;
    full_name: string | null;
    account_size: number | null;
    subscription_end: string | null;
    telegram_chat_id: number | null;
    created_at: string;
    updated_at: string;
    risk_pct?: number | undefined;
    preferred_pairs?: string[] | undefined;
    subscription_status?: "trial" | "expired" | "active" | undefined;
}>;
export type User = z.infer<typeof UserSchema>;
export declare const UpdateUserSettingsSchema: z.ZodObject<{
    account_size: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    risk_pct: z.ZodOptional<z.ZodNumber>;
    preferred_pairs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    account_size?: number | null | undefined;
    risk_pct?: number | undefined;
    preferred_pairs?: string[] | undefined;
}, {
    account_size?: number | null | undefined;
    risk_pct?: number | undefined;
    preferred_pairs?: string[] | undefined;
}>;
export type UpdateUserSettings = z.infer<typeof UpdateUserSettingsSchema>;
