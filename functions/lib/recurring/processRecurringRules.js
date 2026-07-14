"use strict";
/**
 * functions/src/recurring/processRecurringRules.ts
 *
 * Scheduled Cloud Function: runs every hour.
 * Finds all active recurring rules across all users where nextRunDate <= today,
 * creates the transaction, adjusts the wallet balance, and advances nextRunDate
 * — all atomically inside a Firestore transaction.
 *
 * Idempotency strategy:
 *   Inside each Firestore transaction, we re-read the rule. If nextRunDate
 *   has already been advanced past today (by a concurrent invocation), we
 *   skip. Additionally, we check for an existing transaction with the same
 *   recurringRuleId + date before creating one.
 *
 * Error isolation:
 *   A failure for one user/rule does not abort processing of others.
 *   Each rule is wrapped in its own try/catch.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.processRecurringRules = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const v2_1 = require("firebase-functions/v2");
const date_1 = require("../utils/date");
if ((0, app_1.getApps)().length === 0)
    (0, app_1.initializeApp)();
exports.processRecurringRules = (0, scheduler_1.onSchedule)({
    schedule: "0 * * * *", // every hour
    timeZone: "UTC",
    timeoutSeconds: 540,
    memory: "512MiB",
}, async () => {
    const db = (0, firestore_1.getFirestore)();
    const today = (0, date_1.todayUTC)();
    v2_1.logger.info(`[processRecurringRules] Running for date=${today}`);
    const usersSnap = await db.collection("users").get();
    let created = 0;
    let skipped = 0;
    let errors = 0;
    for (const userDoc of usersSnap.docs) {
        const uid = userDoc.id;
        // Query active rules due on or before today
        const rulesSnap = await db
            .collection(`users/${uid}/recurringRules`)
            .where("active", "==", true)
            .where("nextRunDate", "<=", today)
            .get();
        if (rulesSnap.empty)
            continue;
        for (const ruleDoc of rulesSnap.docs) {
            try {
                const ruleRef = ruleDoc.ref;
                await db.runTransaction(async (tx) => {
                    // ── Re-read inside the transaction to prevent concurrent double-fire
                    const freshRule = await tx.get(ruleRef);
                    if (!freshRule.exists)
                        return; // deleted between query and transaction
                    const rule = freshRule.data();
                    // Guard: another invocation may have already advanced nextRunDate
                    if (!(0, date_1.isOnOrBefore)(rule.nextRunDate, today)) {
                        skipped++;
                        return;
                    }
                    const runDate = rule.nextRunDate;
                    const tmpl = rule.templateTransaction;
                    // ── Idempotency check: skip if transaction already exists for this date
                    const existingTx = await db
                        .collection(`users/${uid}/transactions`)
                        .where("recurringRuleId", "==", ruleDoc.id)
                        .where("date", "==", runDate)
                        .limit(1)
                        .get();
                    if (!existingTx.empty) {
                        // Transaction already created — just advance the date
                        tx.update(ruleRef, {
                            nextRunDate: (0, date_1.addCycle)(runDate, rule.frequency),
                            updatedAt: firestore_1.FieldValue.serverTimestamp(),
                        });
                        skipped++;
                        return;
                    }
                    // ── Verify wallet still exists
                    const walletRef = db.doc(`users/${uid}/wallets/${tmpl.walletId}`);
                    const walletSnap = await tx.get(walletRef);
                    if (!walletSnap.exists) {
                        // Deactivate the rule — its wallet was deleted
                        tx.update(ruleRef, { active: false, updatedAt: firestore_1.FieldValue.serverTimestamp() });
                        v2_1.logger.warn(`[processRecurringRules] Deactivated rule ${ruleDoc.id} — wallet deleted`);
                        return;
                    }
                    // ── Create the transaction
                    const txType = tmpl.type;
                    const txAmount = tmpl.amount;
                    const delta = txType === "income" ? txAmount : -txAmount;
                    const now = firestore_1.FieldValue.serverTimestamp();
                    const newTxRef = db.collection(`users/${uid}/transactions`).doc();
                    tx.set(newTxRef, {
                        type: txType,
                        amount: txAmount,
                        currency: tmpl.currency ?? "USD",
                        walletId: tmpl.walletId,
                        categoryId: tmpl.categoryId,
                        merchant: tmpl.merchant ?? "",
                        location: "",
                        notes: tmpl.notes ?? "",
                        tags: tmpl.tags ?? [],
                        receiptUrl: "",
                        date: runDate,
                        paymentMethod: tmpl.paymentMethod ?? "other",
                        isRecurring: true,
                        recurringRuleId: ruleDoc.id,
                        subscriptionId: "",
                        splitWith: [],
                        sharedExpenseGroupId: "",
                        createdAt: now,
                        updatedAt: now,
                    });
                    // ── Atomically adjust wallet balance
                    tx.update(walletRef, {
                        balance: firestore_1.FieldValue.increment(delta),
                        updatedAt: now,
                    });
                    // ── Advance nextRunDate by one cycle
                    tx.update(ruleRef, {
                        nextRunDate: (0, date_1.addCycle)(runDate, rule.frequency),
                        updatedAt: now,
                    });
                    created++;
                });
            }
            catch (err) {
                errors++;
                v2_1.logger.error(`[processRecurringRules] Failed for uid=${uid} rule=${ruleDoc.id}:`, err);
            }
        }
    }
    v2_1.logger.info(`[processRecurringRules] Done. created=${created} skipped=${skipped} errors=${errors}`);
});
//# sourceMappingURL=processRecurringRules.js.map