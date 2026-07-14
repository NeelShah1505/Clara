/**
 * app/api/transactions/route.ts
 *
 * GET  /api/transactions  — paginated, filterable list
 * POST /api/transactions  — create a transaction (atomically updates wallet balance)
 *
 * Balance update strategy (context.md §3.11):
 *   income  → wallet.balance += amount
 *   expense → wallet.balance -= amount
 *   All balance updates happen inside a Firestore transaction so the write
 *   and balance update are atomic — no partial states.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAuth } from "@/lib/firebase/session";
import { assertRateLimit } from "@/lib/server/rateLimit";
import { CreateTransactionSchema } from "@/lib/validation/transaction";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { Transaction, TransactionFilters } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function docToTransaction(doc: FirebaseFirestore.DocumentSnapshot): Transaction {
  const d = doc.data()!;
  const ts = (t: unknown) => (t as Timestamp)?.toDate().toISOString() ?? new Date().toISOString();
  return {
    id:                   doc.id,
    type:                 d.type,
    amount:               d.amount,
    currency:             d.currency,
    walletId:             d.walletId,
    categoryId:           d.categoryId,
    merchant:             d.merchant ?? "",
    location:             d.location ?? "",
    notes:                d.notes ?? "",
    tags:                 d.tags ?? [],
    receiptUrl:           d.receiptUrl ?? "",
    date:                 d.date,
    paymentMethod:        d.paymentMethod ?? "other",
    isRecurring:          d.isRecurring ?? false,
    recurringRuleId:      d.recurringRuleId ?? "",
    subscriptionId:       d.subscriptionId ?? "",
    splitWith:            d.splitWith ?? [],
    sharedExpenseGroupId: d.sharedExpenseGroupId ?? "",
    createdAt:            ts(d.createdAt),
    updatedAt:            ts(d.updatedAt),
  };
}

/** Returns the signed balance delta for a transaction (positive = credit, negative = debit). */
function balanceDelta(type: "expense" | "income", amount: number): number {
  return type === "income" ? amount : -amount;
}

// ── GET /api/transactions ─────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);
    const db = getAdminDb();

    const { searchParams } = new URL(request.url);
    const filters: TransactionFilters = {
      walletId:   searchParams.get("walletId")   ?? undefined,
      type:       (searchParams.get("type") as TransactionFilters["type"]) ?? undefined,
      categoryId: searchParams.get("categoryId") ?? undefined,
      from:       searchParams.get("from")       ?? undefined,
      to:         searchParams.get("to")         ?? undefined,
      limit:      Math.min(Number(searchParams.get("limit") ?? 50), 100),
      cursor:     searchParams.get("cursor")     ?? undefined,
    };

    // Build query dynamically
    let query: FirebaseFirestore.Query = db.collection(`users/${uid}/transactions`);

    if (filters.walletId)   query = query.where("walletId",   "==", filters.walletId);
    if (filters.type)       query = query.where("type",       "==", filters.type);
    if (filters.categoryId) query = query.where("categoryId", "==", filters.categoryId);
    if (filters.from)       query = query.where("date",       ">=", filters.from);
    if (filters.to)         query = query.where("date",       "<=", filters.to);

    query = query.orderBy("date", "desc").limit(filters.limit!);

    // Cursor-based pagination: cursor is a base64-encoded document ID
    if (filters.cursor) {
      const cursorId = Buffer.from(filters.cursor, "base64").toString("utf-8");
      const cursorDoc = await db.doc(`users/${uid}/transactions/${cursorId}`).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.get();
    const transactions: Transaction[] = snapshot.docs.map(docToTransaction);

    // Provide next cursor if there are more results
    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    const nextCursor =
      snapshot.docs.length === filters.limit && lastDoc
        ? Buffer.from(lastDoc.id).toString("base64")
        : null;

    return NextResponse.json({ transactions, nextCursor });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("[GET /api/transactions]", err);
    return NextResponse.json({ error: "Failed to fetch transactions." }, { status: 500 });
  }
}

// ── POST /api/transactions ────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);

    // Rate limit
    await assertRateLimit(uid, "transactionWrite");

    // Parse + validate
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const parsed = CreateTransactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed.", issues: parsed.error.issues },
        { status: 422 }
      );
    }

    const input = parsed.data;
    const db = getAdminDb();
    const now = FieldValue.serverTimestamp();

    // Verify wallet exists and belongs to this user
    const walletRef = db.doc(`users/${uid}/wallets/${input.walletId}`);

    const txRef = db.collection(`users/${uid}/transactions`).doc();
    let createdAt = new Date().toISOString();

    // ── Atomic write: transaction doc + wallet balance update ────────────────
    await db.runTransaction(async (firestoreTx) => {
      const walletSnap = await firestoreTx.get(walletRef);
      if (!walletSnap.exists) {
        throw Object.assign(new Error("WALLET_NOT_FOUND"), { status: 404 });
      }

      const delta = balanceDelta(input.type, input.amount);

      // Write the transaction document
      firestoreTx.set(txRef, {
        type:                 input.type,
        amount:               input.amount,
        currency:             input.currency,
        walletId:             input.walletId,
        categoryId:           input.categoryId,
        merchant:             input.merchant,
        location:             input.location,
        notes:                input.notes,
        tags:                 input.tags,
        receiptUrl:           "",
        date:                 input.date,
        paymentMethod:        input.paymentMethod,
        isRecurring:          input.isRecurring,
        recurringRuleId:      input.recurringRuleId,
        splitWith:            [],
        sharedExpenseGroupId: "",
        createdAt:            now,
        updatedAt:            now,
      });

      // Atomically adjust wallet balance
      firestoreTx.update(walletRef, {
        balance:   FieldValue.increment(delta),
        updatedAt: now,
      });
    });

    return NextResponse.json(
      {
        transaction: {
          id:                   txRef.id,
          ...input,
          merchant:             input.merchant ?? "",
          location:             input.location ?? "",
          notes:                input.notes ?? "",
          tags:                 input.tags ?? [],
          receiptUrl:           "",
          paymentMethod:        input.paymentMethod ?? "other",
          isRecurring:          input.isRecurring ?? false,
          recurringRuleId:      input.recurringRuleId ?? "",
          subscriptionId:       "",
          splitWith:            [],
          sharedExpenseGroupId: "",
          createdAt,
          updatedAt:            createdAt,
        } satisfies Transaction,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof NextResponse) return err;
    const e = err as Error & { status?: number };
    if (e.message === "WALLET_NOT_FOUND") {
      return NextResponse.json({ error: "Wallet not found." }, { status: 404 });
    }
    console.error("[POST /api/transactions]", err);
    return NextResponse.json({ error: "Failed to create transaction." }, { status: 500 });
  }
}
