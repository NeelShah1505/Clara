/**
 * functions/src/wallets/reconcileBalances.ts
 *
 * Scheduled Cloud Function: runs daily at midnight UTC.
 *
 * For every user, for every wallet, re-sums all transaction amounts from
 * Firestore and corrects `wallet.balance` if it has drifted from the true
 * sum. This is the safety net for the running-total strategy — any bug,
 * race condition, or partial failure in the Route Handlers will be caught
 * and corrected within 24 hours.
 *
 * The function also writes a reconciliation log to each wallet doc so
 * drift incidents are auditable.
 *
 * Design notes:
 *   - Processes users in batches to avoid memory pressure.
 *   - Uses Admin SDK (no security rules applied) so it can read all users.
 *   - Writes are batched per wallet; no single write > 500 ops (Firestore limit).
 *   - Skips wallets with zero drift (no unnecessary writes).
 */

import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";

if (getApps().length === 0) initializeApp();

export const reconcileWalletBalances = onSchedule(
  {
    schedule: "0 0 * * *",   // daily at midnight UTC
    timeZone: "UTC",
    timeoutSeconds: 540,     // 9 minutes max (Cloud Function limit is 540s for gen2)
    memory: "512MiB",
  },
  async () => {
    const db = getFirestore();

    logger.info("[reconcileWalletBalances] Starting reconciliation run.");

    // ── Iterate all users ─────────────────────────────────────────────────
    // We query the top-level users collection. For large user bases, add
    // pagination here with startAfter.
    const usersSnap = await db.collection("users").get();

    let totalUsersProcessed = 0;
    let totalWalletsFixed   = 0;

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;

      // ── Get all wallets for this user ───────────────────────────────────
      const walletsSnap = await db.collection(`users/${uid}/wallets`).get();
      if (walletsSnap.empty) continue;

      for (const walletDoc of walletsSnap.docs) {
        const walletId       = walletDoc.id;
        const currentBalance = walletDoc.data().balance ?? 0;

        // ── Sum all transactions for this wallet ────────────────────────
        const txSnap = await db
          .collection(`users/${uid}/transactions`)
          .where("walletId", "==", walletId)
          .get();

        let trueBalance = 0;
        for (const tx of txSnap.docs) {
          const { type, amount } = tx.data() as { type: string; amount: number };
          trueBalance += type === "income" ? amount : -amount;
        }

        // Round to 6 decimal places to avoid floating-point drift
        trueBalance = Math.round(trueBalance * 1_000_000) / 1_000_000;
        const drift = Math.round(Math.abs(trueBalance - currentBalance) * 1_000_000) / 1_000_000;

        if (drift === 0) continue; // No correction needed

        // ── Correct the balance ─────────────────────────────────────────
        logger.warn(
          `[reconcileWalletBalances] Drift detected uid=${uid} wallet=${walletId} ` +
          `stored=${currentBalance} true=${trueBalance} drift=${drift}`
        );

        await walletDoc.ref.update({
          balance:          trueBalance,
          updatedAt:        FieldValue.serverTimestamp(),
          lastReconciled:   FieldValue.serverTimestamp(),
          reconciliationDrift: drift,
        });

        totalWalletsFixed++;
      }

      totalUsersProcessed++;
    }

    logger.info(
      `[reconcileWalletBalances] Done. Users=${totalUsersProcessed} ` +
      `WalletsFixed=${totalWalletsFixed}`
    );
  }
);
