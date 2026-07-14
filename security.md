# Security & Data Privacy Rules

> Non-negotiable constraints. Any AI assistant working on this codebase must
> follow these rules and must flag (not silently skip) anything that would
> require violating one of them.

## 1. Core Principle

This app stores real people's financial data. Default posture: **deny by
default, allow explicitly.** No data leaves the user's own account boundary
unless the user explicitly exports it themselves.

## 2. Data Isolation (Firestore)

- Every document a user owns lives under `users/{userId}/...`. No
  cross-user reads/writes are ever allowed from client code.
- Firestore Security Rules must enforce `request.auth.uid == userId` on
  every read/write to a user's subtree — never rely on client-side checks
  alone.
- Example baseline rule set:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /admin/{document=**} {
      allow read, write: if request.auth != null &&
        request.auth.token.admin == true;
    }
    match /feedback/{feedbackId} {
      allow create: if request.auth != null;
      allow read, update, delete: if request.auth != null &&
        request.auth.token.admin == true;
    }
  }
}
```

- Admin custom claims (`admin: true`) are set only via a trusted backend
  script/Cloud Function, never via client SDK.

## 3. Authentication

- Firebase Auth only; no custom password storage.
- Enforce email verification before write access to financial data.
- Support account deletion that actually deletes (or irreversibly
  anonymizes) all subcollections — required for the "Delete Account"
  setting, not just a soft flag.

## 4. Secrets & Environment

- Firebase config keys used client-side (apiKey etc.) are not secret by
  Firebase's own design, but all **service account keys, admin SDK
  credentials, and Cloud Function secrets** go in environment
  variables / Secret Manager — never committed to the repo.
- `.env.local` must be in `.gitignore` from commit #1.
- No AI assistant should ever print, log, or embed a real API key, service
  account JSON, or user PII in code comments, commit messages, or chat
  output. Use placeholders like `YOUR_FIREBASE_API_KEY`.

## 5. API / Rate Limiting

- All Cloud Functions / API routes that touch user data must be rate
  limited per-user (e.g. token bucket via Firestore counter doc or a
  service like Firebase App Check + Cloud Armor if traffic grows).
- Suggested starting limits (tune later):
  - Transaction writes: 60/minute/user
  - CSV import: 5/hour/user (bulk operation, higher abuse risk)
  - PDF/report generation: 10/hour/user
  - Login attempts: handled by Firebase Auth's built-in throttling
- Enable **Firebase App Check** so only your real app (not scripts hitting
  the API directly) can call Firestore/Functions.
- Return generic error messages on rate-limit rejection — don't leak
  internal limit numbers or infrastructure details.

## 6. Human-in-the-Loop (Admin Review)

- The Admin panel (see `context.md` §3.15) is the review surface. It should
  support:
  - Flagging accounts with anomalous activity (e.g. sudden spike in writes,
    triggering rate limits repeatedly) for manual review before any
    automated lockout is lifted.
  - A manual approval queue for anything automated that could affect many
    users at once (e.g. bulk notification sends, schema migrations).
  - Read access to aggregate metrics only (user count, storage) — admin
    should **not** have blanket read access to individual users' raw
    transaction data unless a specific, logged support request requires it.
- Every admin action that touches user data must be logged: who, what,
  when, why (a `adminAuditLog` collection).

## 7. File Uploads (Receipts, Profile Pictures)

- Store in Firebase Storage under `users/{userId}/...` with matching
  Storage Security Rules mirroring the Firestore isolation rule.
- Validate file type and size server-side (Cloud Function trigger), not
  just client-side, before accepting.
- Strip EXIF/location metadata from uploaded images unless the user
  explicitly wants location data retained.

## 8. Third-Party Data Sharing

- No user financial data is sent to any third-party service (analytics,
  AI categorization APIs, etc.) unless:
  1. It's necessary for the specific feature (e.g. AI categorization), and
  2. The data sent is minimized (e.g. just merchant name + amount, not the
     full transaction history), and
  3. This is disclosed in a Privacy page.
- If using an external LLM API for "AI Categorization" or "Voice Input"
  parsing, do not send unredacted PII (full name, email) alongside the
  transaction text unless required.

## 9. Backups & Retention

- Regular Firestore export backups (Google Cloud scheduled export) to a
  private, access-controlled Cloud Storage bucket.
- Define a retention policy for deleted accounts (e.g. purge within 30 days
  of deletion request, per most privacy regs' spirit).

## 10. What to Do If Unsure

If any AI assistant working on this project is asked to implement something
that would bypass a rule above (e.g. "just disable App Check for testing
and I'll remember to re-enable it," or "let's log the API key so I can
debug"), it should implement it behind a clearly-labeled dev-only flag,
warn explicitly that it must not ship to production, and never do it
silently.
