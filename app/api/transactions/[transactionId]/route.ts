/**
 * app/api/transactions/[transactionId]/route.ts
 *
 * GET    /api/transactions/:id  — fetch a single transaction
 * PATCH  /api/transactions/:id  — update (atomically reverses old balance, applies new)
 * DELETE /api/transactions/:id  — delete (atomically reverses balance effect)
 *
 * Balance reversal logic on PATCH:
 *   If amount, type, or walletId changes, we must:
 *   1. Reverse the old effect on the old wallet.
 *   2. Apply the new effect on the (possibly different) new wallet.
 *   All done atomically inside a Firestore transaction.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAuth } from "@/lib/firebase/session";
import { assertRateLimit } from "@/lib/server/rateLimit";
import { UpdateTransactionSchema } from "@/lib/validation/transaction";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { Transaction } from "@/lib/types";

type Params = { params: Promise<{ transactionId: string }> };

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

function delta(type: "expense" | "income", amount: number) {
  return type === "income" ? amount : -amount;
}

// ── GET /api/transactions/:id ─────────────────────────────────────────────────

export async function GET(request: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);
    const { transactionId } = await params;
    const db = getAdminDb();

    const doc = await db.doc(`users/${uid}/transactions/${transactionId}`).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
    }

    return NextResponse.json({ transaction: docToTransaction(doc) });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("[GET /api/transactions/:id]", err);
    return NextResponse.json({ error: "Failed to fetch transaction." }, { status: 500 });
  }
}

// ── PATCH /api/transactions/:id ───────────────────────────────────────────────

export async function PATCH(request: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);
    const { transactionId } = await params;

    await assertRateLimit(uid, "transactionWrite");

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const parsed = UpdateTransactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed.", issues: parsed.error.issues },
        { status: 422 }
      );
    }

    const updates = parsed.data;
    const db = getAdminDb();
    const txRef = db.doc(`users/${uid}/transactions/${transactionId}`);
    const now = FieldValue.serverTimestamp();

    await db.runTransaction(async (firestoreTx) => {
      const txSnap = await firestoreTx.get(txRef);
      if (!txSnap.exists) {
        throw Object.assign(new Error("NOT_FOUND"), { status: 404 });
      }

      const old = txSnap.data()!;
      const newType     = updates.type     ?? old.type;
      const newAmount   = updates.amount   ?? old.amount;
      const newWalletId = updates.walletId ?? old.walletId;

      // Determine if balance-affecting fields changed
      const balanceChanged =
        updates.type !== undefined ||
        updates.amount !== undefined ||
        updates.walletId !== undefined;

      if (balanceChanged) {
        const oldWalletRef = db.doc(`users/${uid}/wallets/${old.walletId}`);
        const newWalletRef = db.doc(`users/${uid}/wallets/${newWalletId}`);

        const walletSnapsPromise =
          old.walletId === newWalletId
            ? firestoreTx.get(oldWalletRef).then((s) => ({ old: s, new: s }))
            : Promise.all([
                firestoreTx.get(oldWalletRef),
                firestoreTx.get(newWalletRef),
              ]).then(([o, n]) => ({ old: o, new: n }));

        const wallets = await walletSnapsPromise;

        if (!wallets.old.exists) throw Object.assign(new Error("OLD_WALLET_NOT_FOUND"), { status: 404 });
        if (!wallets.new.exists) throw Object.assign(new Error("NEW_WALLET_NOT_FOUND"), { status: 404 });

        if (old.walletId === newWalletId) {
          // Same wallet: net the delta
          const oldDelta = delta(old.type, old.amount);
          const newDelta = delta(newType, newAmount);
          const netDelta = newDelta - oldDelta;
          if (netDelta !== 0) {
            firestoreTx.update(oldWalletRef, {
              balance:   FieldValue.increment(netDelta),
              updatedAt: now,
            });
          }
        } else {
          // Different wallets: reverse old, apply new
          firestoreTx.update(oldWalletRef, {
            balance:   FieldValue.increment(-delta(old.type, old.amount)),
            updatedAt: now,
          });
          firestoreTx.update(newWalletRef, {
            balance:   FieldValue.increment(delta(newType, newAmount)),
            updatedAt: now,
          });
        }
      }

      firestoreTx.update(txRef, { ...updates, updatedAt: now });
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    const e = err as Error & { status?: number };
    if (e.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
    }
    if (e.message === "OLD_WALLET_NOT_FOUND" || e.message === "NEW_WALLET_NOT_FOUND") {
      return NextResponse.json({ error: "Referenced wallet not found." }, { status: 404 });
    }
    console.error("[PATCH /api/transactions/:id]", err);
    return NextResponse.json({ error: "Failed to update transaction." }, { status: 500 });
  }
}

// ── DELETE /api/transactions/:id ──────────────────────────────────────────────

export async function DELETE(request: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);
    const { transactionId } = await params;

    await assertRateLimit(uid, "transactionWrite");

    const db = getAdminDb();
    const txRef = db.doc(`users/${uid}/transactions/${transactionId}`);

    await db.runTransaction(async (firestoreTx) => {
      const txSnap = await firestoreTx.get(txRef);
      if (!txSnap.exists) {
        throw Object.assign(new Error("NOT_FOUND"), { status: 404 });
      }

      const old = txSnap.data()!;
      const walletRef = db.doc(`users/${uid}/wallets/${old.walletId}`);
      const walletSnap = await firestoreTx.get(walletRef);

      // Reverse the balance effect (wallet may have already been deleted)
      if (walletSnap.exists) {
        firestoreTx.update(walletRef, {
          balance:   FieldValue.increment(-delta(old.type, old.amount)),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      firestoreTx.delete(txRef);
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    const e = err as Error & { status?: number };
    if (e.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
    }
    console.error("[DELETE /api/transactions/:id]", err);
    return NextResponse.json({ error: "Failed to delete transaction." }, { status: 500 });
  }
}
