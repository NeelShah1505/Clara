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

import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";

if (getApps().length === 0) initializeApp();

interface SetAdminClaimData {
  targetUid: string;
  grant:     boolean;
  reason?:   string;
}

export const setAdminClaim = onCall(
  { enforceAppCheck: true },
  async (request) => {
    // ── 1. Verify caller is an existing admin ──────────────────────────────
    const callerUid = request.auth?.uid;
    if (!callerUid) {
      throw new HttpsError("unauthenticated", "You must be signed in.");
    }

    const auth = getAuth();
    const callerRecord = await auth.getUser(callerUid);
    if (callerRecord.customClaims?.["admin"] !== true) {
      throw new HttpsError("permission-denied", "Insufficient permissions.");
    }

    // ── 2. Validate input ─────────────────────────────────────────────────
    const { targetUid, grant, reason } = request.data as SetAdminClaimData;

    if (!targetUid || typeof targetUid !== "string") {
      throw new HttpsError("invalid-argument", "targetUid is required.");
    }
    if (typeof grant !== "boolean") {
      throw new HttpsError("invalid-argument", "grant must be a boolean.");
    }
    if (targetUid === callerUid && !grant) {
      throw new HttpsError(
        "failed-precondition",
        "You cannot remove your own admin claim."
      );
    }

    // ── 3. Apply the claim ────────────────────────────────────────────────
    await auth.setCustomUserClaims(targetUid, { admin: grant });

    // ── 4. Immutable audit log ────────────────────────────────────────────
    await getFirestore().collection("adminAuditLog").add({
      action:      grant ? "GRANT_ADMIN" : "REVOKE_ADMIN",
      targetUid,
      performedBy: callerUid,
      reason:      reason ?? "No reason provided",
      timestamp:   FieldValue.serverTimestamp(),
    });

    return { success: true };
  }
);
