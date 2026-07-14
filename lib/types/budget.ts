/**
 * lib/types/budget.ts
 *
 * TypeScript types for the Budget entity (context.md §4).
 * A budget caps spending in a given category for a given calendar month.
 */

export interface Budget {
  id:           string;
  categoryId:   string;
  monthlyLimit: number;   // spending cap in the user's default currency
  month:        string;   // "YYYY-MM", e.g. "2026-07"
  createdAt:    string;
  updatedAt:    string;
}

/** Body accepted by POST /api/budgets */
export interface CreateBudgetInput {
  categoryId:   string;
  monthlyLimit: number;
  month:        string;  // "YYYY-MM"
}

/** Body accepted by PATCH /api/budgets/:id */
export interface UpdateBudgetInput {
  monthlyLimit?: number;
}
