"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.processSubscriptions = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const messaging_1 = require("firebase-admin/messaging");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const v2_1 = require("firebase-functions/v2");
const date_1 = require("../utils/date");
if ((0, app_1.getApps)().length === 0)
    (0, app_1.initializeApp)();
exports.processSubscriptions = (0, scheduler_1.onSchedule)({
    schedule: "0 6 * * *", // daily at 06:00 UTC
    timeZone: "UTC",
    timeoutSeconds: 540,
    memory: "512MiB",
}, async () => {
    const db = (0, firestore_1.getFirestore)();
    const today = (0, date_1.todayUTC)();
    v2_1.logger.info(`[processSubscriptions] Running for date=${today}`);
    const usersSnap = await db.collection("users").get();
    let created = 0;
    let skipped = 0;
    let errors = 0;
    for (const userDoc of usersSnap.docs) {
        const uid = userDoc.id;
        // Query active subscriptions due on or before today
        const subsSnap = await db
            .collection(`users/${uid}/subscriptions`)
            .where("active", "==", true)
            .where("nextDueDate", "<=", today)
            .get();
        if (subsSnap.empty)
            continue;
        for (const subDoc of subsSnap.docs) {
            try {
                const subRef = subDoc.ref;
                await db.runTransaction(async (tx) => {
                    // ── Re-read to guard against concurrent invocations
                    const freshSub = await tx.get(subRef);
                    if (!freshSub.exists)
                        return; // deleted in the meantime
                    const sub = freshSub.data();
                    if (!(0, date_1.isOnOrBefore)(sub.nextDueDate, today)) {
                        skipped++;
                        return;
                    }
                    const dueDate = sub.nextDueDate;
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
                            nextDueDate: (0, date_1.addCycle)(dueDate, sub.billingCycle),
                            updatedAt: firestore_1.FieldValue.serverTimestamp(),
                        });
                        skipped++;
                        return;
                    }
                    // ── Verify wallet still exists
                    const walletRef = db.doc(`users/${uid}/wallets/${sub.walletId}`);
                    const walletSnap = await tx.get(walletRef);
                    if (!walletSnap.exists) {
                        // Deactivate the subscription — its wallet was deleted
                        tx.update(subRef, { active: false, updatedAt: firestore_1.FieldValue.serverTimestamp() });
                        v2_1.logger.warn(`[processSubscriptions] Deactivated subscription ${subDoc.id} — wallet deleted`);
                        return;
                    }
                    // ── Create the expense transaction
                    const amount = sub.amount;
                    const now = firestore_1.FieldValue.serverTimestamp();
                    const newTxRef = db.collection(`users/${uid}/transactions`).doc();
                    tx.set(newTxRef, {
                        type: "expense",
                        amount,
                        currency: sub.currency ?? "USD",
                        walletId: sub.walletId,
                        categoryId: sub.categoryId,
                        merchant: sub.name, // subscription name as merchant
                        location: "",
                        notes: sub.notes ?? `Auto-created by subscription: ${sub.name}`,
                        tags: [],
                        receiptUrl: "",
                        date: dueDate,
                        paymentMethod: "other",
                        isRecurring: true,
                        recurringRuleId: "",
                        subscriptionId: subDoc.id,
                        splitWith: [],
                        sharedExpenseGroupId: "",
                        createdAt: now,
                        updatedAt: now,
                    });
                    // ── Atomically deduct from wallet balance (it's always an expense)
                    tx.update(walletRef, {
                        balance: firestore_1.FieldValue.increment(-amount),
                        updatedAt: now,
                    });
                    // ── Advance nextDueDate by one billing cycle
                    tx.update(subRef, {
                        nextDueDate: (0, date_1.addCycle)(dueDate, sub.billingCycle),
                        updatedAt: now,
                    });
                    created++;
                });
            }
            catch (err) {
                errors++;
                v2_1.logger.error(`[processSubscriptions] Failed for uid=${uid} sub=${subDoc.id}:`, err);
            }
        }
    }
    v2_1.logger.info(`[processSubscriptions] Done. created=${created} skipped=${skipped} errors=${errors}`);
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
        if (tokensSnap.empty)
            continue;
        // Find active subscriptions due in exactly 3 days
        const dueIn3 = await db
            .collection(`users/${uid}/subscriptions`)
            .where("active", "==", true)
            .where("nextDueDate", "==", reminderDate)
            .get();
        for (const subDoc of dueIn3.docs) {
            const sub = subDoc.data();
            const name = sub.name;
            const amount = sub.amount;
            const allTokens = await db.collection(`users/${uid}/fcmTokens`).get();
            const tokenList = allTokens.docs.map((d) => d.data().token).filter(Boolean);
            if (tokenList.length === 0)
                continue;
            try {
                const messaging = (0, messaging_1.getMessaging)();
                await messaging.sendEachForMulticast({
                    tokens: tokenList,
                    notification: {
                        title: "Upcoming Bill 📅",
                        body: `${name} (${amount}) is due in 3 days on ${reminderDate}.`,
                    },
                    data: { subscriptionId: subDoc.id, dueDate: reminderDate },
                });
                v2_1.logger.info(`[processSubscriptions] Sent 3-day reminder uid=${uid} sub=${subDoc.id}`);
            }
            catch (err) {
                v2_1.logger.error(`[processSubscriptions] 3-day reminder failed uid=${uid}:`, err);
            }
        }
    }
});
//# sourceMappingURL=processSubscriptions.js.map