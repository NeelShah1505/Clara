/**
 * lib/validation/category.ts
 *
 * Zod schemas for Category input validation.
 */

import { z } from "zod/v4";

// CSS hex colour: #RGB or #RRGGBB
const HexColorSchema = z
  .string()
  .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "Color must be a valid CSS hex colour (e.g. #FF6B6B)");

export const CreateCategorySchema = z.object({
  name:  z.string().min(1, "Name is required").max(100),
  icon:  z.string().min(1, "Icon is required").max(10),
  color: HexColorSchema,
});

export const UpdateCategorySchema = z.object({
  name:  z.string().min(1).max(100).optional(),
  icon:  z.string().min(1).max(10).optional(),
  color: HexColorSchema.optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  "At least one field must be provided for update"
);

export type CreateCategoryData = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryData = z.infer<typeof UpdateCategorySchema>;
