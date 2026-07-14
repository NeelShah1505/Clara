"use strict";
/**
 * functions/src/auth/setAdminClaim.ts
 *
 * HTTPS Callable: grants or revokes admin custom claim on a user.
 * Uses modular firebase-admin v14 API.
 *
 * Security:
 *   - Requires App Check (enforceAppCheck: true).
 *   - Only existing admins can call this.
 *   - Every invocation logged to adminAuditLog (immutable, append-only).
 *   - Admin claims are NEVER set via client SDK (security.md §2).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.setAdminClaim = void 0;
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
if ((0, app_1.getApps)().length === 0)
    (0, app_1.initializeApp)();
exports.setAdminClaim = (0, https_1.onCall)({ enforceAppCheck: true }, async (request) => {
    // ── 1. Verify caller is an existing admin ──────────────────────────────
    const callerUid = request.auth?.uid;
    if (!callerUid) {
        throw new https_1.HttpsError("unauthenticated", "You must be signed in.");
    }
    const auth = (0, auth_1.getAuth)();
    const callerRecord = await auth.getUser(callerUid);
    if (callerRecord.customClaims?.["admin"] !== true) {
        throw new https_1.HttpsError("permission-denied", "Insufficient permissions.");
    }
    // ── 2. Validate input ─────────────────────────────────────────────────
    const { targetUid, grant, reason } = request.data;
    if (!targetUid || typeof targetUid !== "string") {
        throw new https_1.HttpsError("invalid-argument", "targetUid is required.");
    }
    if (typeof grant !== "boolean") {
        throw new https_1.HttpsError("invalid-argument", "grant must be a boolean.");
    }
    if (targetUid === callerUid && !grant) {
        throw new https_1.HttpsError("failed-precondition", "You cannot remove your own admin claim.");
    }
    // ── 3. Apply the claim ────────────────────────────────────────────────
    await auth.setCustomUserClaims(targetUid, { admin: grant });
    // ── 4. Immutable audit log ────────────────────────────────────────────
    await (0, firestore_1.getFirestore)().collection("adminAuditLog").add({
        action: grant ? "GRANT_ADMIN" : "REVOKE_ADMIN",
        targetUid,
        performedBy: callerUid,
        reason: reason ?? "No reason provided",
        timestamp: firestore_1.FieldValue.serverTimestamp(),
    });
    return { success: true };
});
//# sourceMappingURL=setAdminClaim.js.map