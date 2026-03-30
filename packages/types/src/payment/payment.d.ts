import { z } from "zod";
export declare const PlanNameSchema: z.ZodEnum<["starter", "pro", "elite"]>;
export type PlanName = z.infer<typeof PlanNameSchema>;
export declare const PlanIntervalSchema: z.ZodEnum<["monthly", "quarterly", "yearly"]>;
export type PlanInterval = z.infer<typeof PlanIntervalSchema>;
export declare const PlanSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodEnum<["starter", "pro", "elite"]>;
    price_ngn: z.ZodNumber;
    interval: z.ZodEnum<["monthly", "quarterly", "yearly"]>;
    features: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    is_active: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    name: "starter" | "pro" | "elite";
    id: string;
    price_ngn: number;
    interval: "monthly" | "quarterly" | "yearly";
    features: Record<string, unknown>;
    is_active: boolean;
}, {
    name: "starter" | "pro" | "elite";
    id: string;
    price_ngn: number;
    interval: "monthly" | "quarterly" | "yearly";
    features: Record<string, unknown>;
    is_active: boolean;
}>;
export type Plan = z.infer<typeof PlanSchema>;
export declare const PaymentStatusSchema: z.ZodEnum<["pending", "success", "failed"]>;
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;
export declare const PaymentSchema: z.ZodObject<{
    id: z.ZodString;
    user_id: z.ZodString;
    plan_id: z.ZodString;
    paystack_ref: z.ZodNullable<z.ZodString>;
    amount_kobo: z.ZodNumber;
    status: z.ZodEnum<["pending", "success", "failed"]>;
    paid_at: z.ZodNullable<z.ZodString>;
    created_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    created_at: string;
    user_id: string;
    plan_id: string;
    paystack_ref: string | null;
    amount_kobo: number;
    status: "pending" | "success" | "failed";
    paid_at: string | null;
}, {
    id: string;
    created_at: string;
    user_id: string;
    plan_id: string;
    paystack_ref: string | null;
    amount_kobo: number;
    status: "pending" | "success" | "failed";
    paid_at: string | null;
}>;
export type Payment = z.infer<typeof PaymentSchema>;
export declare const InitializePaymentSchema: z.ZodObject<{
    plan_id: z.ZodString;
    interval: z.ZodEnum<["monthly", "quarterly", "yearly"]>;
}, "strip", z.ZodTypeAny, {
    interval: "monthly" | "quarterly" | "yearly";
    plan_id: string;
}, {
    interval: "monthly" | "quarterly" | "yearly";
    plan_id: string;
}>;
export type InitializePayment = z.infer<typeof InitializePaymentSchema>;
export declare const PLAN_PRICES: Record<PlanName, Record<PlanInterval, number>>;
