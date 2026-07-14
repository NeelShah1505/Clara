"use strict";
/**
 * functions/src/auth/onUserDeleted.ts
 *
 * Firebase Auth trigger: fires when a user account is deleted.
 *
 * Uses the firebase-functions v1 auth.user().onDelete() API because
 * firebase-functions v4 only exposes `identity.beforeUserCreated` (not
 * `beforeUserDeleted`) in its v2 namespace. The v1 trigger works alongside
 * v2 functions in the same deployment with no issues.
 *
 * Responsibility (security.md §3 — hard delete, not a soft flag):
 *   - Recursively deletes all Firestore data under users/{uid}/
 *   - Deletes all Firebase Storage files under users/{uid}/
 *
 * This trigger also acts as a safety net for the deleteUserAccount
 * callable function — if that function fails mid-way, this catches it.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onUserDeleted = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const storage_1 = require("firebase-admin/storage");
const functions = __importStar(require("firebase-functions")); // v1 for auth triggers
if ((0, app_1.getApps)().length === 0)
    (0, app_1.initializeApp)();
exports.onUserDeleted = functions.auth.user().onDelete(async (user) => {
    const uid = user.uid;
    functions.logger.info(`[onUserDeleted] Starting cleanup for uid=${uid}`);
    const db = (0, firestore_1.getFirestore)();
    // ── 1. Delete all Firestore data under users/{uid} ────────────────────────
    try {
        const userDocRef = db.doc(`users/${uid}`);
        await db.recursiveDelete(userDocRef);
        functions.logger.info(`[onUserDeleted] Firestore data deleted for uid=${uid}`);
    }
    catch (err) {
        functions.logger.error(`[onUserDeleted] Failed to delete Firestore data for uid=${uid}`, err);
    }
    // ── 2. Delete all Storage files under users/{uid}/ ────────────────────────
    try {
        const bucket = (0, storage_1.getStorage)().bucket();
        await bucket.deleteFiles({ prefix: `users/${uid}/` });
        functions.logger.info(`[onUserDeleted] Storage files deleted for uid=${uid}`);
    }
    catch (err) {
        functions.logger.error(`[onUserDeleted] Failed to delete Storage files for uid=${uid}`, err);
    }
    functions.logger.info(`[onUserDeleted] Cleanup complete for uid=${uid}`);
});
//# sourceMappingURL=onUserDeleted.js.map