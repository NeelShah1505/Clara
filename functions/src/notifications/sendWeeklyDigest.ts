/**
 * functions/src/notifications/sendWeeklyDigest.ts
 *
 * Scheduled Cloud Function: runs every Monday at 08:00 UTC.
 *
 * For each user who has registered FCM tokens, sends a weekly digest
 * notification summarising:
 *   - Total spent last week
 *   - Total income last week
 *   - Number of transactions
 *   - Top expense category
 *
 * "Last week" = Mon–Sun of the previous calendar week (ISO week).
 *
 * If a user has no transactions last week, no notification is sent
 * (avoids noisy empty digests).
 */

import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";

if (getApps().length === 0) initializeApp();

export const sendWeeklyDigest = onSchedule(
  {
    schedule:       "0 8 * * 1",  // every Monday at 08:00 UTC
    timeZone:       "UTC",
    timeoutSeconds: 540,
    memory:         "512MiB",
  },
  async () => {
    const db = getFirestore();

    // ── Compute last week's date range (Mon–Sun) ──────────────────────────
    const today = new Date();
    // Last Monday = today - today.getUTCDay() (0=Sun,1=Mon...) - 6 days
    const todayDayOfWeek = today.getUTCDay(); // 0=Sun, 1=Mon
    const daysToLastMonday = todayDayOfWeek === 0 ? 6 : todayDayOfWeek - 1 + 7;
    const lastMonday = new Date(Date.UTC(
      today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - daysToLastMonday
    ));
    const lastSunday = new Date(Date.UTC(
      lastMonday.getUTCFullYear(), lastMonday.getUTCMonth(), lastMonday.getUTCDate() + 6
    ));

    const from = formatDate(lastMonday);
    const to   = formatDate(lastSunday);

    logger.info(`[sendWeeklyDigest] Sending digest for week ${from} → ${to}`);

    // Only notify users who have FCM tokens
    const usersSnap = await db.collection("users").get();
    let sent = 0;

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;

      // Quick check: does this user have any FCM tokens?
      const tokensSnap = await db.collection(`users/${uid}/fcmTokens`).limit(1).get();
      if (tokensSnap.empty) continue;

      // Fetch last week's transactions
      const txSnap = await db
        .collection(`users/${uid}/transactions`)
        .where("date", ">=", from)
        .where("date", "<=", to)
        .get();

      if (txSnap.empty) continue; // no activity — skip

      let totalExpense = 0;
      let totalIncome  = 0;
      const categoryTotals = new Map<string, number>();

      for (const doc of txSnap.docs) {
        const d = doc.data();
        if (d.type === "expense") {
          totalExpense += d.amount as number;
          const cid = (d.categoryId as string) || "__other__";
          categoryTotals.set(cid, (categoryTotals.get(cid) ?? 0) + (d.amount as number));
        }
        if (d.type === "income") totalIncome += d.amount as number;
      }

      // Find top expense category name
      let topCategoryName = "";
      if (categoryTotals.size > 0) {
        const topCid  = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1])[0]![0];
        const catSnap = await db.doc(`users/${uid}/categories/${topCid}`).get();
        topCategoryName = catSnap.data()?.name ?? "";
      }

      const netLine = totalIncome > 0
        ? ` Income: ${fmt(totalIncome)}.`
        : "";

      const topLine = topCategoryName
        ? ` Most spent on: ${topCategoryName}.`
        : "";

      const body =
        `${txSnap.size} transactions. Spent: ${fmt(totalExpense)}.${netLine}${topLine}`;

      // Send the notification
      const tokenDocs  = await db.collection(`users/${uid}/fcmTokens`).get();
      const tokensList = tokenDocs.docs.map((d) => d.data().token as string).filter(Boolean);
      if (tokensList.length === 0) continue;

      try {
        const messaging = getMessaging();
        const response  = await messaging.sendEachForMulticast({
          tokens: tokensList,
          notification: { title: "📊 Your Weekly Digest", body },
          data: { type: "weekly_digest", from, to },
        });

        // Prune stale tokens
        const stale: string[] = [];
        response.responses.forEach((res, i) => {
          if (!res.success &&
              (res.error?.code === "messaging/registration-token-not-registered" ||
               res.error?.code === "messaging/invalid-registration-token")) {
            stale.push(tokenDocs.docs[i]!.id);
          }
        });
        if (stale.length > 0) {
          const batch = db.batch();
          stale.forEach((id) => batch.delete(db.doc(`users/${uid}/fcmTokens/${id}`)));
          await batch.commit();
        }

        sent += response.successCount;
      } catch (err) {
        logger.error(`[sendWeeklyDigest] FCM failed for uid=${uid}:`, err);
      }
    }

    logger.info(`[sendWeeklyDigest] Done. Notifications sent=${sent}`);
  }
);

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
