# Project Context — Personal Expense Tracker

> This file is the single source of truth for scope, stack, and feature set.
> Give this to any AI assistant (IDE agent, Claude Code, Cursor, etc.) at the
> start of a session so it knows what the product is and isn't.

## 1. Project Summary

A personal finance / expense tracking web app. Multi-user, cloud-synced,
mobile-friendly, installable as a PWA. Phase 1 goal: **finish the backend,
data model, business logic, and security rules completely before touching
UI/UX.** UI/UX will be designed later from a separate prompt + reference
set — do not generate visual design decisions unless explicitly asked.

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router assumed unless told otherwise) |
| Database / Backend | Firebase (Firestore + Firebase Auth + Cloud Functions) |
| Push Notifications | Firebase Cloud Messaging (FCM) |
| Charts | Recharts |
| Hosting | Firebase Hosting or Vercel (decide at deploy stage) |
| Styling | Deferred — do not decide yet |

Non-functional targets:
- **SEO**: fully server-rendered/meta-tagged public pages, sitemap, robots.txt
- **Performance**: Lighthouse score > 90 on Performance, Accessibility, Best
  Practices, SEO
- **PWA**: installable, offline-capable for read-only cached data
- **Accessibility**: keyboard navigable, screen-reader friendly landmarks

## 3. Feature Map

### 3.1 Dashboard (summary widgets)
Current Balance · This Month Spending · Remaining Budget · Monthly Income ·
Savings · Net Worth · Upcoming Bills · Active Subscriptions · Recent
Transactions · Expense Heatmap · Spending Trend · Daily Spending Graph ·
Weekly Comparison · Budget Progress Rings

### 3.2 Expense Management
**Core**: Add / Edit / Delete / Duplicate expense · Attach receipt · Notes ·
Tags · Categories · Payment method · Merchant name · Location · Currency ·
Expense date · Search · Filter · Sort

**Advanced**: Bulk import CSV · Export CSV · Export PDF · Voice input ·
AI categorization · Recurring expenses · Split expenses · Shared expenses

### 3.3 Income Module
Sources: Salary · Freelancing · Investments · Side Hustles · Gifts ·
Cashback · Refunds
Features: Recurring income · Tax category tagging · Monthly trends

### 3.4 Subscriptions
Fully custom / user-defined (no hardcoded provider list). User creates a
subscription with name, amount, billing cycle, next-due-date, category,
linked wallet. System auto-generates upcoming bill reminders and feeds the
"Active Subscriptions" dashboard widget from this.

### 3.5 Analytics
- Monthly Spending — Line Chart
- Income vs Expense — Bar Chart
- Daily Spending Heatmap — GitHub-contribution-style
- Category Comparison — Horizontal Bars
- Cash Flow — Area Chart
- Budget Utilization — Circular Progress
- Expense Forecast — Predictive (simple moving-average / linear trend to
  start; leave room to swap in a better model later)
- Top Merchants — ranked list derived from merchant field on expenses
- Yearly Comparison
- Average Daily Spending
- Savings Rate
- Financial Health Score (composite 0–100 score, e.g. "82/100 — Excellent";
  define the formula explicitly in code with commented weights so it's
  auditable, not a black box)

### 3.6 Notifications (via FCM)
Budget crossed · Upcoming subscription · Goal achieved · Expense reminder ·
Monthly report ready

### 3.7 Reports
Generate: Monthly PDF · Yearly PDF · Tax Report · Expense Summary · Budget
Summary

### 3.8 Search
Global search across Merchant, Category, Notes, Tags

### 3.9 Calendar
Monthly calendar view showing Expenses, Income, Bills, Subscriptions on
their respective dates

### 3.10 Recurring Transactions
Generic engine (not hardcoded to Rent/Salary/Internet/etc — those are just
examples). User defines frequency + auto-create rule; a scheduled Cloud
Function runs monthly (or on the defined cycle) to auto-create the
transaction.

### 3.11 Wallets / Accounts
Cash · Bank · UPI · Credit Card · Debit Card · PayPal · Crypto — each wallet
carries its own balance; every transaction is linked to a wallet, and wallet
balance is derived/updated from transactions (decide: computed on read vs.
maintained as a running total written on each transaction — recommend
running total + periodic reconciliation job for performance).

### 3.12 Categories
Defaults: Food, Travel, Shopping, Health, Bills, Entertainment, Education,
Investment. Plus user-defined custom categories, each with an icon and a
color.

### 3.13 Open-Source-Friendly Features
Dark mode · Light mode · Themes · Localization (i18n) · Keyboard shortcuts ·
Accessibility · Responsive · Offline mode · PWA
(All deferred to UI phase except the underlying data/i18n plumbing, which
should be structured for now — e.g. don't hardcode English strings deep in
business logic.)

### 3.14 User Settings
Currency · Theme · Timezone · Language · Export data · Delete account ·
Privacy controls · Profile picture

### 3.15 Admin (optional, internal)
User count · Expenses count · Storage usage · Feedback inbox · Announcements
— this doubles as the **human-in-the-loop** control panel referenced in
`security.md` (e.g. reviewing flagged accounts, rate-limit overrides,
manual approval queues).

### 3.16 Public Landing Page
Home · Pricing · Features · About · Docs · GitHub · FAQ · Contact
(Structure and copy only when asked — no visual design yet.)

## 4. Suggested Firestore Data Model (starting point, not final)

```
users/{userId}
  profile: { displayName, email, currency, timezone, language, theme, createdAt }

users/{userId}/wallets/{walletId}
  { name, type, balance, currency, createdAt }

users/{userId}/transactions/{transactionId}
  {
    type: "expense" | "income",
    amount, currency, walletId, categoryId,
    merchant, location, notes, tags[],
    receiptUrl, date, paymentMethod,
    isRecurring, recurringRuleId,
    splitWith[], sharedExpenseGroupId,
    createdAt, updatedAt
  }

users/{userId}/recurringRules/{ruleId}
  { type, amount, frequency, nextRunDate, templateTransaction, active }

users/{userId}/subscriptions/{subId}
  { name, amount, billingCycle, nextDueDate, categoryId, walletId, active }

users/{userId}/categories/{categoryId}
  { name, icon, color, isDefault }

users/{userId}/budgets/{budgetId}
  { categoryId, monthlyLimit, month }

users/{userId}/goals/{goalId}
  { name, targetAmount, currentAmount, deadline }

admin/{adminMetaDoc}
  { userCount, totalExpenses, storageUsedMB, updatedAt }

feedback/{feedbackId}
  { userId, message, status, createdAt }
```

## 5. Explicit Phase Ordering

1. Firebase project setup + Auth + Firestore schema + security rules
2. Core CRUD: transactions, wallets, categories, budgets
3. Recurring engine + subscriptions (Cloud Functions / scheduled jobs)
4. Analytics aggregation logic (can be computed client-side first, move to
   Cloud Functions/BigQuery later if it gets expensive)
5. Notifications (FCM wiring)
6. Reports (PDF generation)
7. Admin panel + rate limiting + human-in-the-loop review flows
8. SEO + performance pass
9. **UI/UX design** — separate prompt, separate session, do not start early

## 6. Explicitly Out of Scope For Now

- Visual design system, component styling, color palettes, layout decisions
- Final choice of hosting provider
- Payment/billing integration (Pricing page is static copy only for now)
