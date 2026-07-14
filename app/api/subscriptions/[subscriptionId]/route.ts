/**
 * app/api/subscriptions/[subscriptionId]/route.ts
 *
 * GET    /api/subscriptions/:id  — fetch a single subscription
 * PATCH  /api/subscriptions/:id  — update any field
 * DELETE /api/subscriptions/:id  — hard delete (existing transactions are kept)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAuth } from "@/lib/firebase/session";
import { UpdateSubscriptionSchema } from "@/lib/validation/subscription";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { Subscription } from "@/lib/types";

type Params = { params: Promise<{ subscriptionId: string }> };

function docToSubscription(doc: FirebaseFirestore.DocumentSnapshot): Subscription {
  const d = doc.data()!;
  const ts = (t: unknown) =>
    (t as Timestamp)?.toDate().toISOString() ?? new Date().toISOString();
  return {
    id:           doc.id,
    name:         d.name,
    amount:       d.amount,
    currency:     d.currency,
    billingCycle: d.billingCycle,
    nextDueDate:  d.nextDueDate,
    categoryId:   d.categoryId,
    walletId:     d.walletId,
    active:       d.active ?? true,
    notes:        d.notes ?? "",
    createdAt:    ts(d.createdAt),
    updatedAt:    ts(d.updatedAt),
  };
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);
    const { subscriptionId } = await params;

    const doc = await getAdminDb()
      .doc(`users/${uid}/subscriptions/${subscriptionId}`)
      .get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Subscription not found." }, { status: 404 });
    }

    return NextResponse.json({ subscription: docToSubscription(doc) });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("[GET /api/subscriptions/:id]", err);
    return NextResponse.json({ error: "Failed to fetch subscription." }, { status: 500 });
  }
}

// ── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);
    const { subscriptionId } = await params;

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const parsed = UpdateSubscriptionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed.", issues: parsed.error.issues },
        { status: 422 }
      );
    }

    const db = getAdminDb();
    const ref = db.doc(`users/${uid}/subscriptions/${subscriptionId}`);
    const existing = await ref.get();

    if (!existing.exists) {
      return NextResponse.json({ error: "Subscription not found." }, { status: 404 });
    }

    // If walletId or categoryId is being updated, verify they exist
    const updates = parsed.data;
    if (updates.walletId) {
      const w = await db.doc(`users/${uid}/wallets/${updates.walletId}`).get();
      if (!w.exists) return NextResponse.json({ error: "Wallet not found." }, { status: 404 });
    }
    if (updates.categoryId) {
      const c = await db.doc(`users/${uid}/categories/${updates.categoryId}`).get();
      if (!c.exists) return NextResponse.json({ error: "Category not found." }, { status: 404 });
    }

    await ref.update({ ...updates, updatedAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("[PATCH /api/subscriptions/:id]", err);
    return NextResponse.json({ error: "Failed to update subscription." }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);
    const { subscriptionId } = await params;

    const db = getAdminDb();
    const ref = db.doc(`users/${uid}/subscriptions/${subscriptionId}`);
    const existing = await ref.get();

    if (!existing.exists) {
      return NextResponse.json({ error: "Subscription not found." }, { status: 404 });
    }

    // Decouple existing auto-created transactions from this subscription before
    // deleting it — the transactions are real financial records and must be kept.
    const linkedTx = await db
      .collection(`users/${uid}/transactions`)
      .where("subscriptionId", "==", subscriptionId)
      .get();

    const batch = db.batch();
    batch.delete(ref);
    for (const tx of linkedTx.docs) {
      batch.update(tx.ref, {
        subscriptionId: "",
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("[DELETE /api/subscriptions/:id]", err);
    return NextResponse.json({ error: "Failed to delete subscription." }, { status: 500 });
  }
}
