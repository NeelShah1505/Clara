/**
 * functions/src/index.ts
 *
 * Barrel export — all Cloud Functions registered here.
 * firebase-admin is initialised centrally; each module guards against double-init.
 */

import { initializeApp, getApps } from "firebase-admin/app";
if (getApps().length === 0) initializeApp();

// ── Auth triggers ─────────────────────────────────────────────────────────────
export { onUserAccountCreated }     from "./auth/onUserCreated";
export { onUserDeleted }     from "./auth/onUserDeleted";

// ── HTTPS Callables ───────────────────────────────────────────────────────────
export { setAdminClaim }     from "./auth/setAdminClaim";
export { deleteUserAccount } from "./auth/deleteUserAccount";

// ── Scheduled Functions ───────────────────────────────────────────────────────
export { reconcileWalletBalances }  from "./wallets/reconcileBalances";
export { processRecurringRules }    from "./recurring/processRecurringRules";
export { processSubscriptions }     from "./subscriptions/processSubscriptions";
export { sendWeeklyDigest }         from "./notifications/sendWeeklyDigest";

// ── Firestore Triggers ────────────────────────────────────────────────────────
export { sendBudgetAlert }          from "./notifications/sendBudgetAlert";
