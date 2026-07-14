/**
 * functions/src/subscriptions/processSubscriptions.ts
 *
 * Scheduled Cloud Function: runs daily at 06:00 UTC.
 * Finds all active subscriptions across all users where nextDueDate <= today,
 * creates an expense transaction, adjusts the wallet balance, and advances
 * nextDueDate — all atomically inside a Firestore transaction.
 *
 * Idempotency strategy:
 *   Same as processRecurringRules — re-read subscription inside the Firestore
 *   transaction, check if nextDueDate has already moved, and check for an
 *   existing transaction with the same subscriptionId + date.
 *
 * Error isolation:
 *   Each subscription is wrapped in its own try/catch so one failure
 *   does not block all others.
 */

import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { addCycle, isOnOrBefore, todayUTC } from "../utils/date";

if (getApps().length === 0) initializeApp();

export const processSubscriptions = onSchedule(
  {
    schedule:       "0 6 * * *",  // daily at 06:00 UTC
    timeZone:       "UTC",
    timeoutSeconds: 540,
    memory:         "512MiB",
  },
  async () => {
    const db    = getFirestore();
    const today = todayUTC();

    logger.info(`[processSubscriptions] Running for date=${today}`);

    const usersSnap = await db.collection("users").get();
    let created = 0;
    let skipped = 0;
    let errors  = 0;

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;

      // Query active subscriptions due on or before today
      const subsSnap = await db
        .collection(`users/${uid}/subscriptions`)
        .where("active", "==", true)
        .where("nextDueDate", "<=", today)
        .get();

      if (subsSnap.empty) continue;

      for (const subDoc of subsSnap.docs) {
        try {
          const subRef = subDoc.ref;

          await db.runTransaction(async (tx) => {
            // ── Re-read to guard against concurrent invocations
            const freshSub = await tx.get(subRef);
            if (!freshSub.exists) return; // deleted in the meantime

            const sub = freshSub.data()!;

            if (!isOnOrBefore(sub.nextDueDate as string, today)) {
              skipped++;
              return;
            }

            const dueDate = sub.nextDueDate as string;

            // ── Idempotency check: skip if expense already created for this date
            const existingTx = await db
              .collection(`users/${uid}/transactions`)
              .where("subscriptionId", "==", subDoc.id)
              .where("date", "==", dueDate)
              .limit(1)
              .get();

            if (!existingTx.empty) {
              // Expense already recorded — just advance the due date
              tx.update(subRef, {
                nextDueDate: addCycle(dueDate, sub.billingCycle as string),
                updatedAt:   FieldValue.serverTimestamp(),
              });
              skipped++;
              return;
            }

            // ── Verify wallet still exists
            const walletRef  = db.doc(`users/${uid}/wallets/${sub.walletId}`);
            const walletSnap = await tx.get(walletRef);

            if (!walletSnap.exists) {
              // Deactivate the subscription — its wallet was deleted
              tx.update(subRef, { active: false, updatedAt: FieldValue.serverTimestamp() });
              logger.warn(
                `[processSubscriptions] Deactivated subscription ${subDoc.id} — wallet deleted`
              );
              return;
            }

            // ── Create the expense transaction
            const amount = sub.amount as number;
            const now    = FieldValue.serverTimestamp();
            const newTxRef = db.collection(`users/${uid}/transactions`).doc();

            tx.set(newTxRef, {
              type:                 "expense",
              amount,
              currency:             sub.currency ?? "USD",
              walletId:             sub.walletId,
              categoryId:           sub.categoryId,
              merchant:             sub.name,          // subscription name as merchant
              location:             "",
              notes:                sub.notes ?? `Auto-created by subscription: ${sub.name}`,
              tags:                 [],
              receiptUrl:           "",
              date:                 dueDate,
              paymentMethod:        "other",
              isRecurring:          true,
              recurringRuleId:      "",
              subscriptionId:       subDoc.id,
              splitWith:            [],
              sharedExpenseGroupId: "",
              createdAt:            now,
              updatedAt:            now,
            });

            // ── Atomically deduct from wallet balance (it's always an expense)
            tx.update(walletRef, {
              balance:   FieldValue.increment(-amount),
              updatedAt: now,
            });

            // ── Advance nextDueDate by one billing cycle
            tx.update(subRef, {
              nextDueDate: addCycle(dueDate, sub.billingCycle as string),
              updatedAt:   now,
            });

            created++;
          });
        } catch (err) {
          errors++;
          logger.error(
            `[processSubscriptions] Failed for uid=${uid} sub=${subDoc.id}:`,
            err
          );
        }
      }
    }

    logger.info(
      `[processSubscriptions] Done. created=${created} skipped=${skipped} errors=${errors}`
    );

    // ── 3-day reminder pass ───────────────────────────────────────────────────
    // Compute the date that is exactly 3 days from now
    const reminderDate = (() => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + 3);
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    })();

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;

      // Check if user has any FCM tokens (skip if not)
      const tokensSnap = await db.collection(`users/${uid}/fcmTokens`).limit(1).get();
      if (tokensSnap.empty) continue;

      // Find active subscriptions due in exactly 3 days
      const dueIn3 = await db
        .collection(`users/${uid}/subscriptions`)
        .where("active", "==", true)
        .where("nextDueDate", "==", reminderDate)
        .get();

      for (const subDoc of dueIn3.docs) {
        const sub  = subDoc.data();
        const name = sub.name as string;
        const amount = sub.amount as number;

        const allTokens = await db.collection(`users/${uid}/fcmTokens`).get();
        const tokenList = allTokens.docs.map((d) => d.data().token as string).filter(Boolean);
        if (tokenList.length === 0) continue;

        try {
          const messaging = getMessaging();
          await messaging.sendEachForMulticast({
            tokens: tokenList,
            notification: {
              title: "Upcoming Bill 📅",
              body:  `${name} (${amount}) is due in 3 days on ${reminderDate}.`,
            },
            data: { subscriptionId: subDoc.id, dueDate: reminderDate },
          });
          logger.info(`[processSubscriptions] Sent 3-day reminder uid=${uid} sub=${subDoc.id}`);
        } catch (err) {
          logger.error(`[processSubscriptions] 3-day reminder failed uid=${uid}:`, err);
        }
      }
    }
  }
);
