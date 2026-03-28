import { z } from "zod";

export const SubscriptionStatusSchema = z.enum(["trial", "active", "expired"]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  full_name: z.string().nullable(),
  account_size: z.number().nullable(),
  risk_pct: z.number().min(0.5).max(5).default(1.0),
  preferred_pairs: z.array(z.string()).default([]),
  subscription_status: SubscriptionStatusSchema.default("trial"),
  subscription_end: z.string().datetime().nullable(),
  telegram_chat_id: z.number().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type User = z.infer<typeof UserSchema>;

export const UpdateUserSettingsSchema = z.object({
  account_size: z.number().positive().nullable().optional(),
  risk_pct: z.number().min(0.5).max(5).optional(),
  preferred_pairs: z.array(z.string()).optional(),
});
export type UpdateUserSettings = z.infer<typeof UpdateUserSettingsSchema>;
