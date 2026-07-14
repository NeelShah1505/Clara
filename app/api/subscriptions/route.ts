/**
 * app/api/subscriptions/route.ts
 *
 * GET  /api/subscriptions  — list all subscriptions (?active=true to filter)
 * POST /api/subscriptions  — create a new subscription
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAuth } from "@/lib/firebase/session";
import { assertRateLimit } from "@/lib/server/rateLimit";
import { CreateSubscriptionSchema } from "@/lib/validation/subscription";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { Subscription } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── GET /api/subscriptions ────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);
    const db = getAdminDb();

    const activeFilter = new URL(request.url).searchParams.get("active");

    let query: FirebaseFirestore.Query = db
      .collection(`users/${uid}/subscriptions`)
      .orderBy("nextDueDate", "asc");  // nearest due date first (dashboard widget order)

    if (activeFilter === "true")  query = query.where("active", "==", true);
    if (activeFilter === "false") query = query.where("active", "==", false);

    const snapshot = await query.get();
    const subscriptions: Subscription[] = snapshot.docs.map(docToSubscription);

    return NextResponse.json({ subscriptions });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("[GET /api/subscriptions]", err);
    return NextResponse.json({ error: "Failed to fetch subscriptions." }, { status: 500 });
  }
}

// ── POST /api/subscriptions ───────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);
    await assertRateLimit(uid, "transactionWrite");

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const parsed = CreateSubscriptionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed.", issues: parsed.error.issues },
        { status: 422 }
      );
    }

    const { name, amount, currency, billingCycle, nextDueDate, categoryId, walletId, notes } =
      parsed.data;

    const db = getAdminDb();

    // Verify wallet and category exist
    const [walletSnap, categorySnap] = await Promise.all([
      db.doc(`users/${uid}/wallets/${walletId}`).get(),
      db.doc(`users/${uid}/categories/${categoryId}`).get(),
    ]);

    if (!walletSnap.exists) {
      return NextResponse.json({ error: "Wallet not found." }, { status: 404 });
    }
    if (!categorySnap.exists) {
      return NextResponse.json({ error: "Category not found." }, { status: 404 });
    }

    const now = FieldValue.serverTimestamp();
    const ref = db.collection(`users/${uid}/subscriptions`).doc();

    await ref.set({
      name, amount, currency, billingCycle, nextDueDate,
      categoryId, walletId, active: true,
      notes: notes ?? "",
      createdAt: now, updatedAt: now,
    });

    return NextResponse.json(
      {
        subscription: {
          id: ref.id,
          name, amount, currency, billingCycle, nextDueDate,
          categoryId, walletId, active: true,
          notes: notes ?? "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } satisfies Subscription,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("[POST /api/subscriptions]", err);
    return NextResponse.json({ error: "Failed to create subscription." }, { status: 500 });
  }
}
