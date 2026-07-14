"use strict";
/**
 * functions/src/auth/deleteUserAccount.ts
 *
 * HTTPS Callable: allows a signed-in user to delete their own account.
 * Uses modular firebase-admin v14 API.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUserAccount = void 0;
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const storage_1 = require("firebase-admin/storage");
const https_1 = require("firebase-functions/v2/https");
if ((0, app_1.getApps)().length === 0)
    (0, app_1.initializeApp)();
exports.deleteUserAccount = (0, https_1.onCall)({ enforceAppCheck: true }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new https_1.HttpsError("unauthenticated", "You must be signed in to delete your account.");
    }
    const db = (0, firestore_1.getFirestore)();
    // ── 1. Delete Firestore data ─────────────────────────────────────────
    try {
        await db.recursiveDelete(db.doc(`users/${uid}`));
    }
    catch {
        throw new https_1.HttpsError("internal", "Failed to delete your data. Please try again or contact support.");
    }
    // ── 2. Delete Storage files ──────────────────────────────────────────
    try {
        const bucket = (0, storage_1.getStorage)().bucket();
        await bucket.deleteFiles({ prefix: `users/${uid}/` });
    }
    catch (err) {
        console.error(`[deleteUserAccount] Storage deletion failed for ${uid}:`, err);
    }
    // ── 3. Delete Auth user ───────────────────────────────────────────────
    try {
        await (0, auth_1.getAuth)().deleteUser(uid);
    }
    catch {
        throw new https_1.HttpsError("internal", "Data deleted but Auth record removal failed. Please contact support.");
    }
    return { success: true };
});
//# sourceMappingURL=deleteUserAccount.js.map