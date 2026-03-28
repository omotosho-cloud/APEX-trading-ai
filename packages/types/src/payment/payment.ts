import { z } from "zod";

export const PlanNameSchema = z.enum(["starter", "pro", "elite"]);
export type PlanName = z.infer<typeof PlanNameSchema>;

export const PlanIntervalSchema = z.enum(["monthly", "quarterly", "yearly"]);
export type PlanInterval = z.infer<typeof PlanIntervalSchema>;

export const PlanSchema = z.object({
  id: z.string().uuid(),
  name: PlanNameSchema,
  price_ngn: z.number().int().positive(), // price in Kobo
  interval: PlanIntervalSchema,
  features: z.record(z.string(), z.unknown()),
  is_active: z.boolean(),
});
export type Plan = z.infer<typeof PlanSchema>;

export const PaymentStatusSchema = z.enum(["pending", "success", "failed"]);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

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
export type Payment = z.infer<typeof PaymentSchema>;

export const InitializePaymentSchema = z.object({
  plan_id: z.string().uuid(),
  interval: PlanIntervalSchema,
});
export type InitializePayment = z.infer<typeof InitializePaymentSchema>;

// Plan pricing in Kobo (1 NGN = 100 Kobo)
export const PLAN_PRICES: Record<PlanName, Record<PlanInterval, number>> = {
  starter: { monthly: 499900, quarterly: 1299900, yearly: 4499900 },
  pro:     { monthly: 999900, quarterly: 2699900, yearly: 8999900 },
  elite:   { monthly: 1999900, quarterly: 5299900, yearly: 17999900 },
};
