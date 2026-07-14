/**
 * lib/types/transaction.ts
 *
 * TypeScript types for the Transaction entity.
 * Covers both expense and income (context.md §3.2, §3.3, §4).
 */

export type TransactionType = "expense" | "income";

export type PaymentMethod =
  | "cash"
  | "card"
  | "upi"
  | "bank_transfer"
  | "cheque"
  | "other";

/** Full transaction document shape (Firestore doc + id). */
export interface Transaction {
  id:         string;
  type:       TransactionType;
  amount:     number;          // always positive; type determines sign effect on wallet
  currency:   string;          // ISO 4217
  walletId:   string;
  categoryId: string;
  merchant:   string;
  location:   string;
  notes:      string;
  tags:       string[];
  receiptUrl: string;          // Firebase Storage URL, empty string if none
  date:       string;          // ISO 8601 date, e.g. "2026-07-13"
  paymentMethod: PaymentMethod;

  // Recurring
  isRecurring:     boolean;
  recurringRuleId: string;     // ref to recurringRules/{id}, empty if not recurring
  subscriptionId:  string;     // ref to subscriptions/{id}, empty if not from a subscription

  // Split / shared
  splitWith:           string[];  // array of user UIDs
  sharedExpenseGroupId: string;   // empty if not shared

  createdAt: string;
  updatedAt: string;
}

/** Body accepted by POST /api/transactions */
export interface CreateTransactionInput {
  type:          TransactionType;
  amount:        number;
  currency:      string;
  walletId:      string;
  categoryId:    string;
  date:          string;        // "YYYY-MM-DD"
  merchant?:     string;
  location?:     string;
  notes?:        string;
  tags?:         string[];
  paymentMethod?: PaymentMethod;
  isRecurring?:  boolean;
  recurringRuleId?: string;
}

/** Body accepted by PATCH /api/transactions/:id */
export interface UpdateTransactionInput {
  type?:          TransactionType;
  amount?:        number;
  currency?:      string;
  walletId?:      string;
  categoryId?:    string;
  date?:          string;
  merchant?:      string;
  location?:      string;
  notes?:         string;
  tags?:          string[];
  paymentMethod?: PaymentMethod;
}

/** Query params accepted by GET /api/transactions */
export interface TransactionFilters {
  walletId?:    string;
  type?:        TransactionType;
  categoryId?:  string;
  from?:        string;   // "YYYY-MM-DD"
  to?:          string;   // "YYYY-MM-DD"
  limit?:       number;   // default 50, max 100
  cursor?:      string;   // base64-encoded Firestore doc ID for pagination
}
