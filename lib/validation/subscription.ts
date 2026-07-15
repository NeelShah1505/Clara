/**
 * lib/validation/subscription.ts
 *
 * Zod schemas for Subscription input validation.
 * Used server-side in Route Handlers only.
 */

import { z } from "zod/v4";

const BILLING_CYCLES = ["weekly", "monthly", "quarterly", "yearly", "custom"] as const;

const CurrencySchema = z
  .string()
  .length(3)
  .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter ISO 4217 code");

const DateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .refine((d) => !isNaN(Date.parse(d)), "Must be a valid calendar date");

export const CreateSubscriptionSchema = z.object({
  name:         z.string().min(1, "Name is required").max(200),
  amount:       z.number().positive("Amount must be greater than 0").finite(),
  currency:     CurrencySchema,
  billingCycle: z.enum(BILLING_CYCLES),
  nextDueDate:  DateStringSchema,
  categoryId:   z.string().min(1, "categoryId is required"),
  walletId:     z.string().min(1, "walletId is required"),
  notes:        z.string().max(2000).optional().default(""),
  customDays:   z.number().positive().int().optional(),
});

export const UpdateSubscriptionSchema = z.object({
  name:         z.string().min(1).max(200).optional(),
  amount:       z.number().positive().finite().optional(),
  currency:     CurrencySchema.optional(),
  billingCycle: z.enum(BILLING_CYCLES).optional(),
  nextDueDate:  DateStringSchema.optional(),
  categoryId:   z.string().min(1).optional(),
  walletId:     z.string().min(1).optional(),
  active:       z.boolean().optional(),
  notes:        z.string().max(2000).optional(),
  customDays:   z.number().positive().int().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  "At least one field must be provided for update"
);

export type CreateSubscriptionData = z.infer<typeof CreateSubscriptionSchema>;
export type UpdateSubscriptionData = z.infer<typeof UpdateSubscriptionSchema>;
