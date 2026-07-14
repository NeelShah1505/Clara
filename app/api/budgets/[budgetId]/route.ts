/**
 * app/api/budgets/[budgetId]/route.ts
 *
 * GET    /api/budgets/:id  — fetch a single budget
 * PATCH  /api/budgets/:id  — update monthlyLimit
 * DELETE /api/budgets/:id  — delete a budget
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAuth } from "@/lib/firebase/session";
import { UpdateBudgetSchema } from "@/lib/validation/budget";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { Budget } from "@/lib/types";

type Params = { params: Promise<{ budgetId: string }> };

function docToBudget(doc: FirebaseFirestore.DocumentSnapshot): Budget {
  const d = doc.data()!;
  const ts = (t: unknown) =>
    (t as Timestamp)?.toDate().toISOString() ?? new Date().toISOString();
  return {
    id:           doc.id,
    categoryId:   d.categoryId,
    monthlyLimit: d.monthlyLimit,
    month:        d.month,
    createdAt:    ts(d.createdAt),
    updatedAt:    ts(d.updatedAt),
  };
}

// ── GET /api/budgets/:id ──────────────────────────────────────────────────────

export async function GET(request: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);
    const { budgetId } = await params;
    const db = getAdminDb();

    const doc = await db.doc(`users/${uid}/budgets/${budgetId}`).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Budget not found." }, { status: 404 });
    }

    return NextResponse.json({ budget: docToBudget(doc) });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("[GET /api/budgets/:id]", err);
    return NextResponse.json({ error: "Failed to fetch budget." }, { status: 500 });
  }
}

// ── PATCH /api/budgets/:id ────────────────────────────────────────────────────

export async function PATCH(request: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);
    const { budgetId } = await params;

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const parsed = UpdateBudgetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed.", issues: parsed.error.issues },
        { status: 422 }
      );
    }

    const db = getAdminDb();
    const ref = db.doc(`users/${uid}/budgets/${budgetId}`);
    const existing = await ref.get();

    if (!existing.exists) {
      return NextResponse.json({ error: "Budget not found." }, { status: 404 });
    }

    await ref.update({
      ...parsed.data,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("[PATCH /api/budgets/:id]", err);
    return NextResponse.json({ error: "Failed to update budget." }, { status: 500 });
  }
}

// ── DELETE /api/budgets/:id ───────────────────────────────────────────────────

export async function DELETE(request: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);
    const { budgetId } = await params;
    const db = getAdminDb();

    const ref = db.doc(`users/${uid}/budgets/${budgetId}`);
    const existing = await ref.get();

    if (!existing.exists) {
      return NextResponse.json({ error: "Budget not found." }, { status: 404 });
    }

    await ref.delete();
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("[DELETE /api/budgets/:id]", err);
    return NextResponse.json({ error: "Failed to delete budget." }, { status: 500 });
  }
}
