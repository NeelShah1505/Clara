/**
 * functions/src/notifications/sendBudgetAlert.ts
 *
 * Firestore trigger: fires after any transaction document is written
 * (created or updated) under users/{uid}/transactions/{txId}.
 *
 * On each write it:
 *   1. Identifies the expense's category and the current month.
 *   2. Checks if there is a budget for that category in this month.
 *   3. Sums all expenses in that category for the month.
 *   4. If total crosses 80% or 100% of the budget limit (and hasn't
 *      notified yet for that threshold this month), sends an FCM push.
 *
 * Threshold de-duplication:
 *   A sub-doc `users/{uid}/budgets/{budgetId}/alerts/{month}` tracks which
 *   thresholds (80, 100) have already fired so the user doesn't get spammed.
 *   These are ephemeral records and auto-cleaned by the daily reconciliation.
 *
 * Only fires for expense transactions — income transactions are ignored.
 */

import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";

if (getApps().length === 0) initializeApp();

export const sendBudgetAlert = onDocumentWritten(
  "users/{uid}/transactions/{txId}",
  async (event) => {
    const uid  = event.params.uid;
    const data = event.data?.after?.data();

    // Only process expense transactions that exist after the write
    if (!data || data.type !== "expense") return;

    const categoryId = data.categoryId as string;
    if (!categoryId) return;

    const txDate  = (data.date as string).slice(0, 7); // "YYYY-MM"
    const db      = getFirestore();

    // Find the budget for this category + month
    const budgetSnap = await db
      .collection(`users/${uid}/budgets`)
      .where("categoryId", "==", categoryId)
      .where("month", "==", txDate)
      .limit(1)
      .get();

    if (budgetSnap.empty) return; // no budget set for this category

    const budgetDoc  = budgetSnap.docs[0]!;
    const budgetId   = budgetDoc.id;
    const limit      = budgetDoc.data().monthlyLimit as number;

    // Sum all expenses in this category for the current month
    const [fromDate, toDate] = monthBounds(txDate);
    const txSnap = await db
      .collection(`users/${uid}/transactions`)
      .where("type", "==", "expense")
      .where("categoryId", "==", categoryId)
      .where("date", ">=", fromDate)
      .where("date", "<=", toDate)
      .get();

    let total = 0;
    for (const d of txSnap.docs) total += d.data().amount as number;

    const percent = limit > 0 ? (total / limit) * 100 : 0;

    // Determine which thresholds (if any) to fire
    const thresholdsToCheck: Array<{ key: string; pct: number; label: string }> = [
      { key: "100", pct: 100, label: "reached your limit" },
      { key: "80",  pct: 80,  label: "reached 80% of your" },
    ];

    // Load the alert state doc for this budget + month
    const alertRef  = db.doc(`users/${uid}/budgets/${budgetId}/alerts/${txDate}`);
    const alertSnap = await alertRef.get();
    const fired     = (alertSnap.data()?.fired as string[]) ?? [];

    const newFired: string[] = [];

    for (const { key, pct, label } of thresholdsToCheck) {
      if (percent < pct) continue;     // threshold not reached
      if (fired.includes(key)) continue; // already sent this threshold

      // Get category name for the notification
      const catSnap = await db.doc(`users/${uid}/categories/${categoryId}`).get();
      const catName = catSnap.data()?.name ?? "a category";

      await sendFcmToUser(uid, {
        title: "Budget Alert 🔔",
        body:  `You've ${label} ${catName} budget for ${txDate}.`,
        data:  { budgetId, categoryId, month: txDate, threshold: key },
      });

      newFired.push(key);
      logger.info(`[sendBudgetAlert] Sent ${key}% alert uid=${uid} budget=${budgetId}`);
    }

    if (newFired.length > 0) {
      await alertRef.set(
        { fired: [...fired, ...newFired], updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
    }
  }
);

// ── Helpers ───────────────────────────────────────────────────────────────────

function monthBounds(month: string): [string, string] {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return [`${month}-01`, `${month}-${String(lastDay).padStart(2, "0")}`];
}

async function sendFcmToUser(
  uid:     string,
  payload: { title: string; body: string; data?: Record<string, string> }
): Promise<void> {
  const db     = getFirestore();
  const tokens = await db.collection(`users/${uid}/fcmTokens`).get();
  if (tokens.empty) return;

  const tokenStrings = tokens.docs.map((d) => d.data().token as string).filter(Boolean);
  if (tokenStrings.length === 0) return;

  const messaging = getMessaging();
  const response  = await messaging.sendEachForMulticast({
    tokens: tokenStrings,
    notification: { title: payload.title, body: payload.body },
    data: payload.data ?? {},
  });

  // Prune stale tokens
  const stale: string[] = [];
  response.responses.forEach((res, i) => {
    if (!res.success &&
       (res.error?.code === "messaging/registration-token-not-registered" ||
        res.error?.code === "messaging/invalid-registration-token")) {
      stale.push(tokens.docs[i]!.id);
    }
  });
  if (stale.length > 0) {
    const batch = db.batch();
    stale.forEach((id) => batch.delete(db.doc(`users/${uid}/fcmTokens/${id}`)));
    await batch.commit();
  }
}
