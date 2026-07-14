/**
 * functions/src/auth/deleteUserAccount.ts
 *
 * HTTPS Callable: allows a signed-in user to delete their own account.
 * Uses modular firebase-admin v14 API.
 */

import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { onCall, HttpsError } from "firebase-functions/v2/https";

if (getApps().length === 0) initializeApp();

export const deleteUserAccount = onCall(
  { enforceAppCheck: true },
  async (request) => {
    const uid = request.auth?.uid;

    if (!uid) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in to delete your account."
      );
    }

    const db = getFirestore();

    // ── 1. Delete Firestore data ─────────────────────────────────────────
    try {
      await db.recursiveDelete(db.doc(`users/${uid}`));
    } catch {
      throw new HttpsError(
        "internal",
        "Failed to delete your data. Please try again or contact support."
      );
    }

    // ── 2. Delete Storage files ──────────────────────────────────────────
    try {
      const bucket = getStorage().bucket();
      await bucket.deleteFiles({ prefix: `users/${uid}/` });
    } catch (err) {
      console.error(`[deleteUserAccount] Storage deletion failed for ${uid}:`, err);
    }

    // ── 3. Delete Auth user ───────────────────────────────────────────────
    try {
      await getAuth().deleteUser(uid);
    } catch {
      throw new HttpsError(
        "internal",
        "Data deleted but Auth record removal failed. Please contact support."
      );
    }

    return { success: true };
  }
);
