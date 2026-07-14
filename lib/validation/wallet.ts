/**
 * lib/validation/wallet.ts
 *
 * Zod schemas for Wallet input validation.
 * Used server-side in Route Handlers only.
 */

import { z } from "zod/v4";

const WALLET_TYPES = [
  "cash",
  "bank",
  "upi",
  "credit_card",
  "debit_card",
  "paypal",
  "crypto",
] as const;

// ISO 4217 basic check: 3 uppercase letters
const CurrencySchema = z
  .string()
  .length(3)
  .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter ISO 4217 code (e.g. USD, INR)");

export const CreateWalletSchema = z.object({
  name:           z.string().min(1, "Name is required").max(100),
  type:           z.enum(WALLET_TYPES, { error: "Invalid wallet type" }),
  currency:       CurrencySchema,
  openingBalance: z.number().finite().optional().default(0),
});

export const UpdateWalletSchema = z.object({
  name:     z.string().min(1).max(100).optional(),
  type:     z.enum(WALLET_TYPES).optional(),
  currency: CurrencySchema.optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  "At least one field must be provided for update"
);

export type CreateWalletData = z.infer<typeof CreateWalletSchema>;
export type UpdateWalletData = z.infer<typeof UpdateWalletSchema>;
