/**
 * lib/validation/transaction.ts
 *
 * Zod schemas for Transaction input validation.
 * Used server-side in Route Handlers only.
 */

import { z } from "zod/v4";

const TRANSACTION_TYPES = ["expense", "income"] as const;

const PAYMENT_METHODS = [
  "cash",
  "card",
  "upi",
  "bank_transfer",
  "cheque",
  "other",
] as const;

// "YYYY-MM-DD" date string
const DateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .refine((d) => !isNaN(Date.parse(d)), "Date must be a valid calendar date");

// ISO 4217 currency
const CurrencySchema = z
  .string()
  .length(3)
  .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter ISO 4217 code");

export const CreateTransactionSchema = z.object({
  type:           z.enum(TRANSACTION_TYPES),
  amount:         z.number().positive("Amount must be greater than 0").finite(),
  currency:       CurrencySchema,
  walletId:       z.string().min(1, "walletId is required"),
  categoryId:     z.string().min(1, "categoryId is required"),
  date:           DateStringSchema,
  merchant:       z.string().max(200).optional().default(""),
  location:       z.string().max(500).optional().default(""),
  notes:          z.string().max(2000).optional().default(""),
  tags:           z.array(z.string().max(50)).max(20).optional().default([]),
  paymentMethod:  z.enum(PAYMENT_METHODS).optional().default("other"),
  isRecurring:    z.boolean().optional().default(false),
  recurringRuleId: z.string().optional().default(""),
});

export const UpdateTransactionSchema = z.object({
  type:          z.enum(TRANSACTION_TYPES).optional(),
  amount:        z.number().positive().finite().optional(),
  currency:      CurrencySchema.optional(),
  walletId:      z.string().min(1).optional(),
  categoryId:    z.string().min(1).optional(),
  date:          DateStringSchema.optional(),
  merchant:      z.string().max(200).optional(),
  location:      z.string().max(500).optional(),
  notes:         z.string().max(2000).optional(),
  tags:          z.array(z.string().max(50)).max(20).optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  "At least one field must be provided for update"
);

export type CreateTransactionData = z.infer<typeof CreateTransactionSchema>;
export type UpdateTransactionData = z.infer<typeof UpdateTransactionSchema>;
