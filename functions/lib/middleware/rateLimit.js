"use strict";
/**
 * functions/src/middleware/rateLimit.ts
 *
 * Token-bucket rate limiter backed by Firestore.
 * Uses modular firebase-admin v14 API.
 *
 * Each user has a rate-limit bucket stored at:
 *   users/{uid}/_meta/rateLimit
 *
 * Starting limits (security.md §5):
 *   - transactionWrite:    60 / minute  / user
 *   - csvImport:            5 / hour    / user
 *   - reportGeneration:    10 / hour    / user
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertRateLimit = assertRateLimit;
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const LIMITS = {
    transactionWrite: { maxRequests: 60, windowMs: 60 * 1000 },
    csvImport: { maxRequests: 5, windowMs: 60 * 60 * 1000 },
    reportGeneration: { maxRequests: 10, windowMs: 60 * 60 * 1000 },
};
// ── Rate limit enforcement ────────────────────────────────────────────────────
async function assertRateLimit(uid, action) {
    const db = (0, firestore_1.getFirestore)();
    const bucketRef = db.doc(`users/${uid}/_meta/rateLimit`);
    const { maxRequests, windowMs } = LIMITS[action];
    const now = Date.now();
    const windowStart = now - windowMs;
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(bucketRef);
        const data = snap.data() ?? {};
        const timestamps = (data[action] ?? []).filter((t) => t > windowStart);
        if (timestamps.length >= maxRequests) {
            throw new https_1.HttpsError("resource-exhausted", "Too many requests. Please try again later.");
        }
        timestamps.push(now);
        tx.set(bucketRef, { [action]: timestamps, lastUpdated: firestore_1.FieldValue.serverTimestamp() }, { merge: true });
    });
}
//# sourceMappingURL=rateLimit.js.map