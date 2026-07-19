/**
 * lib/types/wallet.ts
 *
 * TypeScript types for the Wallet entity.
 * Mirrors the Firestore schema in context.md §4.
 */

export type WalletType =
  | "cash"
  | "bank"
  | "upi"
  | "credit_card"
  | "debit_card"
  | "paypal"
  | "crypto"
  | "savings"
  | (string & {});  // allow custom wallet types

/** Shape of a wallet document as stored in Firestore + client ID field. */
export interface Wallet {
  id:        string;
  name:      string;
  type:      WalletType;
  /** Running balance in the wallet's native currency. Updated atomically on every transaction write. */
  balance:   number;
  currency:  string;  // ISO 4217, e.g. "USD", "INR"
  createdAt: string;  // ISO 8601
  updatedAt: string;  // ISO 8601
}

/** Body accepted by POST /api/wallets */
export interface CreateWalletInput {
  name:     string;
  type:     WalletType;
  currency: string;
  /** Optional opening balance (default 0). Recorded as an income transaction if non-zero. */
  openingBalance?: number;
}

/** Body accepted by PATCH /api/wallets/:id */
export interface UpdateWalletInput {
  name?:     string;
  type?:     WalletType;
  currency?: string;
}
