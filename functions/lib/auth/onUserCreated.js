"use strict";
/**
 * functions/src/auth/onUserCreated.ts
 *
 * Firebase Auth trigger: fires when a new user account is created.
 * Uses firebase-functions v1 auth trigger because v2 blocking triggers
 * require Google Cloud Identity Platform to be enabled.
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
exports.onUserAccountCreated = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const functions = __importStar(require("firebase-functions"));
if ((0, app_1.getApps)().length === 0)
    (0, app_1.initializeApp)();
// ── Default categories (context.md §3.12) ─────────────────────────────────────
const DEFAULT_CATEGORIES = [
    { name: "Food & Dining", icon: "🍔", color: "#FF6B6B", isDefault: true },
    { name: "Travel", icon: "✈️", color: "#4ECDC4", isDefault: true },
    { name: "Shopping", icon: "🛍️", color: "#45B7D1", isDefault: true },
    { name: "Health", icon: "💊", color: "#96CEB4", isDefault: true },
    { name: "Bills", icon: "📄", color: "#FFEAA7", isDefault: true },
    { name: "Entertainment", icon: "🎬", color: "#DDA0DD", isDefault: true },
    { name: "Education", icon: "📚", color: "#98D8C8", isDefault: true },
    { name: "Investment", icon: "📈", color: "#F7DC6F", isDefault: true },
];
// ── Trigger ────────────────────────────────────────────────────────────────────
exports.onUserAccountCreated = functions.auth.user().onCreate(async (user) => {
    const uid = user.uid;
    functions.logger.info(`[onUserCreated] Seeding data for uid=${uid}`);
    const db = (0, firestore_1.getFirestore)();
    const batch = db.batch();
    // ── Profile document ───────────────────────────────────────────────────────
    const profileRef = db.doc(`users/${uid}`);
    batch.set(profileRef, {
        displayName: user.displayName ?? "",
        email: user.email ?? "",
        currency: "USD",
        timezone: "UTC",
        language: "en",
        theme: "system",
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    });
    // ── Default categories ─────────────────────────────────────────────────────
    for (const category of DEFAULT_CATEGORIES) {
        const categoryRef = db.collection(`users/${uid}/categories`).doc();
        batch.set(categoryRef, {
            ...category,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
        });
    }
    // ── Default "Cash" wallet ─────────────────────────────────────────────────
    const walletRef = db.collection(`users/${uid}/wallets`).doc();
    batch.set(walletRef, {
        name: "Cash",
        type: "cash",
        balance: 0,
        currency: "USD",
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    });
    await batch.commit();
    functions.logger.info(`[onUserCreated] Seeded profile, ${DEFAULT_CATEGORIES.length} categories, ` +
        `and 1 wallet for uid=${uid}`);
});
//# sourceMappingURL=onUserCreated.js.map