import { z } from "zod";
export const PlanNameSchema = z.enum(["starter", "pro", "elite"]);
export const PlanIntervalSchema = z.enum(["monthly", "quarterly", "yearly"]);
export const PlanSchema = z.object({
    id: z.string().uuid(),
    name: PlanNameSchema,
    price_ngn: z.number().int().positive(), // price in Kobo
    interval: PlanIntervalSchema,
    features: z.record(z.string(), z.unknown()),
    is_active: z.boolean(),
});
export const PaymentStatusSchema = z.enum(["pending", "success", "failed"]);
export const PaymentSchema = z.object({
    id: z.string().uuid(),
    user_id: z.string().uuid(),
    plan_id: z.string().uuid(),
    paystack_ref: z.string().nullable(),
    amount_kobo: z.number().int().positive(),
    status: PaymentStatusSchema,
    paid_at: z.string().datetime().nullable(),
    created_at: z.string().datetime(),
});
export const InitializePaymentSchema = z.object({
    plan_id: z.string().uuid(),
    interval: PlanIntervalSchema,
});
// Plan pricing in Kobo (1 NGN = 100 Kobo)
export const PLAN_PRICES = {
    starter: { monthly: 499900, quarterly: 1299900, yearly: 4499900 },
    pro: { monthly: 999900, quarterly: 2699900, yearly: 8999900 },
    elite: { monthly: 1999900, quarterly: 5299900, yearly: 17999900 },
};
//# sourceMappingURL=payment.js.map