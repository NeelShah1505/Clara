/**
 * lib/validation/recurringRule.ts
 *
 * Zod schemas for RecurringRule input validation.
 * Used server-side in Route Handlers only.
 */

import { z } from "zod/v4";

const FREQUENCIES = [
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "yearly",
] as const;

const TRANSACTION_TYPES    = ["expense", "income"] as const;
const PAYMENT_METHODS      = ["cash", "card", "upi", "bank_transfer", "cheque", "other"] as const;

// ISO 4217 currency
const CurrencySchema = z
  .string()
  .length(3)
  .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter ISO 4217 code");

// "YYYY-MM-DD" date string
const DateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .refine((d) => !isNaN(Date.parse(d)), "Must be a valid calendar date");

const TemplateTransactionSchema = z.object({
  type:          z.enum(TRANSACTION_TYPES),
  amount:        z.number().positive("Amount must be greater than 0").finite(),
  currency:      CurrencySchema,
  walletId:      z.string().min(1, "walletId is required"),
  categoryId:    z.string().min(1, "categoryId is required"),
  merchant:      z.string().max(200).optional().default(""),
  notes:         z.string().max(2000).optional().default(""),
  tags:          z.array(z.string().max(50)).max(20).optional().default([]),
  paymentMethod: z.enum(PAYMENT_METHODS).optional().default("other"),
});

export const CreateRecurringRuleSchema = z.object({
  frequency:           z.enum(FREQUENCIES),
  nextRunDate:         DateStringSchema.optional(),  // defaults to tomorrow in handler
  templateTransaction: TemplateTransactionSchema,
});

export const UpdateRecurringRuleSchema = z.object({
  active:      z.boolean().optional(),
  frequency:   z.enum(FREQUENCIES).optional(),
  nextRunDate: DateStringSchema.optional(),
  templateTransaction: TemplateTransactionSchema.partial().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  "At least one field must be provided for update"
);

export type CreateRecurringRuleData = z.infer<typeof CreateRecurringRuleSchema>;
export type UpdateRecurringRuleData = z.infer<typeof UpdateRecurringRuleSchema>;
