# Project Memory Log

> Living document. Update this after every meaningful work session so any
> AI assistant (or you, months later) can pick up context instantly without
> re-reading the whole chat history. Keep entries short and factual.
> Newest entries at the top.

## How to use this file
- At the **start** of a session: read this file + `context.md` +
  `security.md` before writing any code.
- At the **end** of a session: append a new dated entry below with what
  changed, what was decided, and what's next.
- If a decision in `context.md` gets overridden, note the override here
  and update `context.md` directly (don't let them drift apart).

---

## Project Status Snapshot
*(keep this section current — overwrite, don't append)*

- **Phase**: Frontend scaffolding + Security — Phase 5 complete
- **Stack confirmed**: Next.js 16 (App Router), Firebase Admin 14, Firebase Client 12,
  Firebase Functions 4, Zod 4, pdfkit 0.15 (reports), Recharts (deferred)
- **Not started**: UI/UX visual phase (Phase 6)
- **Blocking decisions needed**: None.

### Feature build status
| Module | Status |
|---|---|
| Firebase project + Auth setup    | ✅ Complete |
| Firestore schema + security rules | ✅ Complete |
| Wallets/Accounts CRUD             | ✅ Complete |
| Expense CRUD                      | ✅ Complete |
| Income CRUD                       | ✅ Complete |
| Categories (default + custom)     | ✅ Complete |
| Subscriptions (custom engine)     | ✅ Complete (CRUD API + daily Cloud Function) |
| Recurring transactions engine     | ✅ Complete (CRUD API + hourly Cloud Function) |
| Budgets                           | ✅ Complete |
| Analytics/aggregation             | ✅ Complete (5 Route Handler endpoints) |
| Notifications (FCM)               | ✅ Complete (budget alert, subscription reminder, weekly digest) |
| Reports (PDF)                     | ✅ Complete (pdfkit, POST /api/reports/generate) |
| Search                            | Not started (frontend) |
| Calendar view                     | Not started (frontend) |
| Admin panel + rate limiting       | ✅ Complete — full API + page scaffolds + IP rate limit |
| SEO + performance pass            | Not started |
| UI/UX                             | Scaffolded — visual design Phase 6 |

---

## Decision Log
*(append-only — record why a choice was made, so it isn't re-litigated)*

- **2026-07-13** — Initial planning session. Compiled full feature list from
  user's notes into `context.md`. Confirmed stack: Next.js + Firebase +
  Recharts. UI/UX explicitly deferred to a later, separate prompt. Security
  approach: per-user Firestore subtree isolation, App Check, rate limiting,
  admin human-in-the-loop review panel.

---

## Session Entries
*(newest first — one entry per work session)*

### 2026-07-14 — Phase 5: Security Hardening + Frontend Scaffolding
- Created `middleware.ts` (Next.js Edge Middleware):
  - IP rate limiting: 100 req/min global, 10 req/min on `/api/auth/*` (in-memory LRU)
  - Auth gate: redirects unauthenticated users to `/login?redirect=...`
  - Admin gate: reads `admin` claim from JWT (unverified, for redirect only); real enforcement in `requireAdmin()`
  - Security headers: CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy on every response
- Created `lib/server/ipRateLimit.ts` — sliding-window in-memory rate limiter (two buckets: global + auth)
- Created `lib/server/sanitize.ts` — strips HTML tags, Firestore injection keys (`$`-prefix, dot-keys), normalises unicode NFC
- Extended `lib/firebase/session.ts` — added `isAdmin` to `AuthContext`, new `requireAdmin()` + `withAdmin()` helpers
- Created Admin API routes (all require `admin: true` custom claim):
  - `GET /api/admin/stats` — user count + meta stats
  - `GET /api/admin/users` — paginated Auth user listing
  - `GET /api/admin/users/[uid]` — full user profile
  - `POST/DELETE /api/admin/users/[uid]/ban` — disable/enable Auth account + Firestore flag
  - `POST/DELETE /api/admin/users/[uid]/promote` — grant/revoke admin custom claim with audit log
  - `GET/POST /api/admin/settings` — read/write whitelisted feature flags
- Created full page scaffold tree (route groups):
  - `(public)`: `/`, `/about`, `/contact`
  - `(auth)`: `/login`, `/signup`, `/forgot-password`
  - `(app)`: dashboard, transactions, wallets, categories, budgets, subscriptions, recurring, goals, analytics, calendar, reports, settings
  - `(admin)`: `/admin`, `/admin/users`, `/admin/users/[uid]`, `/admin/settings`
- TypeScript: zero errors. Functions build: clean.
- **Next up**: Phase 6 — UI/UX visual design (layouts, components, Recharts integration).

### 2026-07-14 — Phase 4: Analytics, FCM Notifications, PDF Reports
- Installed `pdfkit` + `@types/pdfkit`.
- Created analytics Route Handlers:
  - `app/api/analytics/summary/route.ts` — income/expense/net for a month
  - `app/api/analytics/by-category/route.ts` — spending per category with %
  - `app/api/analytics/budget-vs-actual/route.ts` — limit vs actual, percentUsed, isOverBudget
  - `app/api/analytics/top-merchants/route.ts` — ranked merchant spend
  - `app/api/analytics/trend/route.ts` — monthly income+expense for last N months
- Created FCM infrastructure:
  - `lib/firebase/fcm.ts` — `sendToUser()` helper with stale-token cleanup
  - `app/api/notifications/register-token/route.ts` — idempotent token storage
  - `functions/src/notifications/sendBudgetAlert.ts` — Firestore trigger on tx writes
    fires at 80% and 100% budget thresholds with per-budget deduplication doc
  - `functions/src/notifications/sendWeeklyDigest.ts` — Monday 08:00 UTC digest
  - Modified `processSubscriptions.ts` — added 3-day due-date reminder pass
- Created PDF report handler:
  - `app/api/reports/generate/route.ts` — A4 PDF with header, summary, category breakdown,
    transactions table. Rate limited at 10/hr. Returns binary PDF stream.
- Exported `getAdminApp()` from `lib/firebase/admin.ts` for use by FCM helper.
- **Key decisions**:
  - No Cloud Function for analytics — Node.js in-process aggregation is fast enough
    for personal scale (hundreds to low-thousands of transactions).
  - `>30 categories` in budget-vs-actual handled via chunked `in` queries (30 per batch).
  - Budget alert deduplication stored in `budgets/{id}/alerts/{month}` sub-docs —
    ephemeral, only tracks fired thresholds. One Firestore read per alert check.
  - FCM token stored using URL-encoded token as doc ID — idempotent re-registration
    without a prior query.
  - PDF footer uses `doc.bufferedPageRange()` for correct total-page count.
- TypeScript: zero errors. Functions build: clean.
- **Backend phase complete.** All data APIs, scheduled jobs, and notification flows are
  implemented. Ready for UI/UX phase when instructed.

### 2026-07-13 — Phase 3: Recurring Transactions Engine + Subscriptions
- Created types: `lib/types/{recurringRule,subscription}.ts`; added `subscriptionId` to `Transaction`.
- Created `lib/utils/date.ts` — pure date arithmetic: `addCycle`, `isOnOrBefore`, `todayUTC`.
  Also created `functions/src/utils/date.ts` (identical copy, self-contained for deploy).
- Created Zod validators: `lib/validation/{recurringRule,subscription}.ts`.
- Created Route Handlers:
  - `app/api/recurring-rules/route.ts` (GET, POST) + `[ruleId]/route.ts` (GET, PATCH, DELETE)
  - `app/api/subscriptions/route.ts` (GET, POST) + `[subscriptionId]/route.ts` (GET, PATCH, DELETE)
- Created Cloud Functions:
  - `functions/src/recurring/processRecurringRules.ts` — hourly (`0 * * * *`)
  - `functions/src/subscriptions/processSubscriptions.ts` — daily at 06:00 UTC
  Both use `db.runTransaction` for atomicity + idempotency (re-read + existing-tx check).
- Added 2 new Firestore indexes (`recurringRuleId+date`, `subscriptionId+date` for idempotency queries).
- Created `tests/date.test.ts` — 26 tests, all passing.
- **Bug caught by tests**: Initial monthly/quarterly clamping used wrong formula for
  JS `Date.UTC` 0-indexed months. Fixed in both copies. Tests verified the fix.
- **Key decisions**:
  - Recurring rules and subscriptions are separate collections (different semantics + UI surfaces).
  - Recurring rule DELETE decouples linked transactions (clears recurringRuleId) rather than
    deleting them — they are real financial records.
  - Scheduled function uses re-read inside Firestore transaction as primary idempotency guard,
    plus a `where(recurringRuleId/subscriptionId + date)` query as secondary guard.
  - Rule auto-deactivates if its wallet is deleted (prevents orphaned charges).
  - `functions/src/utils/date.ts` is a local copy — functions deploy is self-contained.
- TypeScript: zero errors. Functions build: clean. Tests: 26/26 passing.
- **Next up**: Phase 4 — Analytics aggregation, FCM notifications, PDF reports.

### 2026-07-13 — Phase 2: Core CRUD (Wallets, Transactions, Categories, Budgets)
- Installed Zod 4 for server-side validation.
- Created shared TypeScript types: `lib/types/{wallet,transaction,category,budget,index}.ts`.
- Created server helpers:
  - `lib/firebase/session.ts` — `requireAuth()` + `withAuth()` wrapper for all Route Handlers
  - `lib/server/rateLimit.ts` — Next.js Route Handler rate limiter (mirrors Functions version)
- Created Zod validators: `lib/validation/{wallet,transaction,category,budget}.ts`
- Created Route Handlers (all with auth, validation, rate-limiting):
  - `app/api/wallets/route.ts` (GET, POST)
  - `app/api/wallets/[walletId]/route.ts` (GET, PATCH, DELETE)
  - `app/api/transactions/route.ts` (GET paginated with cursor, POST)
  - `app/api/transactions/[transactionId]/route.ts` (GET, PATCH, DELETE)
  - `app/api/categories/route.ts` (GET, POST)
  - `app/api/categories/[categoryId]/route.ts` (GET, PATCH, DELETE)
  - `app/api/budgets/route.ts` (GET, POST)
  - `app/api/budgets/[budgetId]/route.ts` (GET, PATCH, DELETE)
- Created Cloud Function: `functions/src/wallets/reconcileBalances.ts`
  — daily scheduled reconciliation of wallet balances vs. transaction sums
- Added 3 new composite Firestore indexes.
- **Key decisions**:
  - Read strategy: direct Firestore client SDK (real-time); Write strategy: Route Handlers (admin SDK + validation)
  - Wallet balance is a **running total** maintained atomically via `FieldValue.increment` inside Firestore transactions on every tx write/update/delete
  - PATCH transaction: same-wallet uses net-delta; cross-wallet reverses old + applies new, all atomically
  - Budgets enforce one-per-(categoryId, month) at the API level (server query before write)
  - Category delete checks both transactions AND budgets before allowing
- TypeScript: zero errors (Next.js root + functions sub-project).
- Functions build: clean.
- **Next up**: Phase 3 — Recurring transactions engine + Subscriptions
  (Cloud Functions scheduled jobs, `users/{uid}/recurringRules`, `users/{uid}/subscriptions`)

### 2026-07-13 — Phase 1: Firebase setup + Auth + Firestore schema + Security rules
- Scaffolded Next.js 16 (App Router, TypeScript, no Tailwind) in workspace root.
- Installed `firebase@12`, `firebase-admin@14`, test deps (`jest`, `ts-jest`,
  `@firebase/rules-unit-testing`).
- Created:
  - `lib/firebase/client.ts` — lazy singleton, emulator-aware
  - `lib/firebase/admin.ts` — modular Admin SDK v14, server-only
  - `lib/firebase/app-check.ts` — reCAPTCHA v3 App Check
  - `lib/firebase/auth.ts` — signUp/signIn/Google/signOut/deleteAccount/useAuth
  - `app/api/auth/session/route.ts` — session cookie + per-IP rate limiting
  - `firestore.rules` — isOwner + isEmailVerified + isAdmin + immutable auditLog
  - `storage.rules` — user-scoped + email-verified + size/type guards
  - `firestore.indexes.json` — 8 composite indexes pre-declared
  - `firebase.json` — emulator config + security headers
  - `.firebaserc` — project alias placeholder
  - `functions/src/auth/onUserCreated.ts` — seeds profile + 8 categories + Cash wallet
  - `functions/src/auth/onUserDeleted.ts` — recursive hard delete (v1 trigger)
  - `functions/src/auth/deleteUserAccount.ts` — user-callable hard delete
  - `functions/src/auth/setAdminClaim.ts` — admin-only, App Check enforced, audited
  - `functions/src/middleware/rateLimit.ts` — Firestore token bucket
  - `scripts/seed-default-categories.ts` — idempotent dev seed script
  - `tests/firestore-rules.test.ts` — 8 security rule scenarios
  - `.env.local.example`, `.gitignore` updated with secrets exclusions
- TypeScript: zero errors (both Next.js root and `functions/` sub-project).
- Functions TypeScript build: clean.
- **Key decisions**:
  - firebase-admin v14 requires modular imports (`firebase-admin/app`, `firebase-admin/auth`, etc.) — NOT `import * as admin from 'firebase-admin'` for getters.
  - `firebase-functions/v2` identity only has `beforeUserCreated`; `onDelete` requires v1 `auth.user().onDelete()` — both coexist fine in one deployment.
  - `@firebase/rules-unit-testing@3` has peer dep `firebase@^10`; installed with `--legacy-peer-deps` (test-only, no runtime conflict).
- **Next up**: Phase 2 — Core CRUD: Wallets, Transactions (expense + income), Categories.
  Start with `users/{uid}/wallets` Firestore CRUD functions + server-side validation.

### 2026-07-13 — Project kickoff
- Created `context.md`, `security.md`, `memory.md`, `ide-prompt.md`.
- No code written yet.
- **Next up**: Initialize Next.js project, set up Firebase project (Auth +
  Firestore), implement baseline security rules from `security.md` §2.
