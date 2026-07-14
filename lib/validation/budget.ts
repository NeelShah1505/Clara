/**
 * lib/validation/budget.ts
 *
 * Zod schemas for Budget input validation.
 */

import { z } from "zod/v4";

// "YYYY-MM" month string
const MonthSchema = z
  .string()
  .regex(/^\d{4}-(?:0[1-9]|1[0-2])$/, "Month must be in YYYY-MM format (e.g. 2026-07)");

export const CreateBudgetSchema = z.object({
  categoryId:   z.string().min(1, "categoryId is required"),
  monthlyLimit: z.number().positive("Monthly limit must be greater than 0").finite(),
  month:        MonthSchema,
});

export const UpdateBudgetSchema = z.object({
  monthlyLimit: z.number().positive().finite().optional(),
}).refine(
  (data) => data.monthlyLimit !== undefined,
  "monthlyLimit is required for update"
);

export type CreateBudgetData = z.infer<typeof CreateBudgetSchema>;
export type UpdateBudgetData = z.infer<typeof UpdateBudgetSchema>;
