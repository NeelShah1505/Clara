"use strict";
/**
 * functions/src/index.ts
 *
 * Barrel export — all Cloud Functions registered here.
 * firebase-admin is initialised centrally; each module guards against double-init.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendBudgetAlert = exports.sendWeeklyDigest = exports.processSubscriptions = exports.processRecurringRules = exports.reconcileWalletBalances = exports.deleteUserAccount = exports.setAdminClaim = exports.onUserDeleted = exports.onUserAccountCreated = void 0;
const app_1 = require("firebase-admin/app");
if ((0, app_1.getApps)().length === 0)
    (0, app_1.initializeApp)();
// ── Auth triggers ─────────────────────────────────────────────────────────────
var onUserCreated_1 = require("./auth/onUserCreated");
Object.defineProperty(exports, "onUserAccountCreated", { enumerable: true, get: function () { return onUserCreated_1.onUserAccountCreated; } });
var onUserDeleted_1 = require("./auth/onUserDeleted");
Object.defineProperty(exports, "onUserDeleted", { enumerable: true, get: function () { return onUserDeleted_1.onUserDeleted; } });
// ── HTTPS Callables ───────────────────────────────────────────────────────────
var setAdminClaim_1 = require("./auth/setAdminClaim");
Object.defineProperty(exports, "setAdminClaim", { enumerable: true, get: function () { return setAdminClaim_1.setAdminClaim; } });
var deleteUserAccount_1 = require("./auth/deleteUserAccount");
Object.defineProperty(exports, "deleteUserAccount", { enumerable: true, get: function () { return deleteUserAccount_1.deleteUserAccount; } });
// ── Scheduled Functions ───────────────────────────────────────────────────────
var reconcileBalances_1 = require("./wallets/reconcileBalances");
Object.defineProperty(exports, "reconcileWalletBalances", { enumerable: true, get: function () { return reconcileBalances_1.reconcileWalletBalances; } });
var processRecurringRules_1 = require("./recurring/processRecurringRules");
Object.defineProperty(exports, "processRecurringRules", { enumerable: true, get: function () { return processRecurringRules_1.processRecurringRules; } });
var processSubscriptions_1 = require("./subscriptions/processSubscriptions");
Object.defineProperty(exports, "processSubscriptions", { enumerable: true, get: function () { return processSubscriptions_1.processSubscriptions; } });
var sendWeeklyDigest_1 = require("./notifications/sendWeeklyDigest");
Object.defineProperty(exports, "sendWeeklyDigest", { enumerable: true, get: function () { return sendWeeklyDigest_1.sendWeeklyDigest; } });
// ── Firestore Triggers ────────────────────────────────────────────────────────
var sendBudgetAlert_1 = require("./notifications/sendBudgetAlert");
Object.defineProperty(exports, "sendBudgetAlert", { enumerable: true, get: function () { return sendBudgetAlert_1.sendBudgetAlert; } });
//# sourceMappingURL=index.js.map