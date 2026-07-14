/**
 * lib/types/subscription.ts
 *
 * TypeScript types for the Subscription entity (context.md §3.4, §4).
 *
 * A subscription tracks a recurring bill / service. It is entirely
 * user-defined — no hardcoded provider list. When the nextDueDate arrives,
 * a scheduled Cloud Function creates an expense transaction and advances
 * the date by one billing cycle.
 *
 * Unlike a recurringRule (which is about automating any transaction),
 * a subscription always represents an expense and carries a human-readable
 * service name that appears in the "Active Subscriptions" dashboard widget.
 */

export type BillingCycle = "weekly" | "monthly" | "quarterly" | "yearly";

/** Full subscription document shape (Firestore doc + id). */
export interface Subscription {
  id:           string;
  name:         string;     // e.g. "Netflix", "Spotify", "Gym"
  amount:       number;
  currency:     string;     // ISO 4217
  billingCycle: BillingCycle;
  /** ISO 8601 date string "YYYY-MM-DD" — next bill date. */
  nextDueDate:  string;
  categoryId:   string;
  walletId:     string;
  active:       boolean;
  notes:        string;
  createdAt:    string;
  updatedAt:    string;
}

/** Body accepted by POST /api/subscriptions */
export interface CreateSubscriptionInput {
  name:         string;
  amount:       number;
  currency:     string;
  billingCycle: BillingCycle;
  nextDueDate:  string;     // "YYYY-MM-DD", must not be in the past
  categoryId:   string;
  walletId:     string;
  notes?:       string;
}

/** Body accepted by PATCH /api/subscriptions/:id */
export interface UpdateSubscriptionInput {
  name?:         string;
  amount?:       number;
  currency?:     string;
  billingCycle?: BillingCycle;
  nextDueDate?:  string;
  categoryId?:   string;
  walletId?:     string;
  active?:       boolean;
  notes?:        string;
}
