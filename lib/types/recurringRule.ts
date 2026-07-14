/**
 * lib/types/recurringRule.ts
 *
 * TypeScript types for the RecurringRule entity (context.md §3.10, §4).
 *
 * A recurring rule holds a template transaction and a frequency.
 * A scheduled Cloud Function reads all active rules whose nextRunDate is
 * on or before today, creates the real transaction from the template,
 * updates the wallet balance atomically, and advances nextRunDate by one
 * cycle.
 */

export type Frequency =
  | "daily"
  | "weekly"
  | "biweekly"   // every 2 weeks
  | "monthly"
  | "quarterly"  // every 3 months
  | "yearly";

/**
 * Snapshot of the transaction fields that will be copied each time the
 * rule fires. Stored as a sub-object on the rule document so the full
 * transaction shape is captured at rule-creation time.
 */
export interface RecurringTransactionTemplate {
  type:          "expense" | "income";
  amount:        number;
  currency:      string;
  walletId:      string;
  categoryId:    string;
  merchant:      string;
  notes:         string;
  tags:          string[];
  paymentMethod: string;
}

/** Full recurring rule document shape (Firestore doc + id). */
export interface RecurringRule {
  id:                  string;
  active:              boolean;
  frequency:           Frequency;
  /** ISO 8601 date string "YYYY-MM-DD" — the next date this rule will fire. */
  nextRunDate:         string;
  templateTransaction: RecurringTransactionTemplate;
  createdAt:           string;
  updatedAt:           string;
}

/** Body accepted by POST /api/recurring-rules */
export interface CreateRecurringRuleInput {
  frequency:           Frequency;
  /** Optional; defaults to tomorrow if omitted. */
  nextRunDate?:        string;
  templateTransaction: RecurringTransactionTemplate;
}

/** Body accepted by PATCH /api/recurring-rules/:id */
export interface UpdateRecurringRuleInput {
  active?:              boolean;
  frequency?:           Frequency;
  nextRunDate?:         string;
  templateTransaction?: Partial<RecurringTransactionTemplate>;
}
