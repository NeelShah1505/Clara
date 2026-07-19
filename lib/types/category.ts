/**
 * lib/types/category.ts
 *
 * TypeScript types for the Category entity (context.md §3.12).
 * Covers both the 8 default categories (seeded on signup) and
 * user-defined custom categories.
 */

export interface Category {
  id:        string;
  name:      string;
  type:      "income" | "expense";
  icon:      string;      // emoji or icon identifier
  color:     string;      // hex colour, e.g. "#FF6B6B"
  isDefault: boolean;     // true for the 8 seeded defaults — cannot be deleted
  createdAt: string;
}

/** Body accepted by POST /api/categories */
export interface CreateCategoryInput {
  name:  string;
  icon:  string;
  color: string;         // must be a valid CSS hex colour
}

/** Body accepted by PATCH /api/categories/:id */
export interface UpdateCategoryInput {
  name?:  string;
  icon?:  string;
  color?: string;
}
