/**
 * app/api/budgets/route.ts
 *
 * GET  /api/budgets  — list budgets, optionally filtered by ?month=YYYY-MM
 * POST /api/budgets  — create a budget (enforces one per categoryId+month pair)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAuth } from "@/lib/firebase/session";
import { CreateBudgetSchema } from "@/lib/validation/budget";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { Budget } from "@/lib/types";

// ── GET /api/budgets ──────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);
    const db = getAdminDb();

    const month = new URL(request.url).searchParams.get("month");

    let query: FirebaseFirestore.Query = db
      .collection(`users/${uid}/budgets`)
      .orderBy("month", "desc");

    if (month) {
      query = query.where("month", "==", month);
    }

    const snapshot = await query.get();

    const budgets: Budget[] = snapshot.docs.map((doc) => {
      const d = doc.data();
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
    });

    return NextResponse.json({ budgets });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("[GET /api/budgets]", err);
    return NextResponse.json({ error: "Failed to fetch budgets." }, { status: 500 });
  }
}

// ── POST /api/budgets ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const parsed = CreateBudgetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed.", issues: parsed.error.issues },
        { status: 422 }
      );
    }

    const { categoryId, monthlyLimit, month } = parsed.data;
    const db = getAdminDb();

    // Enforce uniqueness: one budget per (categoryId, month) pair
    const existing = await db
      .collection(`users/${uid}/budgets`)
      .where("categoryId", "==", categoryId)
      .where("month", "==", month)
      .limit(1)
      .get();

    if (!existing.empty) {
      // Upsert: update the existing budget's limit instead of failing
      const existingDoc = existing.docs[0];
      await existingDoc.ref.update({ monthlyLimit, updatedAt: FieldValue.serverTimestamp() });
      return NextResponse.json({
        budget: {
          id: existingDoc.id,
          categoryId,
          monthlyLimit,
          month,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } satisfies Budget,
      });
    }

    // Verify the category exists
    const categoryDoc = await db.doc(`users/${uid}/categories/${categoryId}`).get();
    if (!categoryDoc.exists) {
      return NextResponse.json({ error: "Category not found." }, { status: 404 });
    }

    const now = FieldValue.serverTimestamp();
    const ref = db.collection(`users/${uid}/budgets`).doc();
    await ref.set({ categoryId, monthlyLimit, month, createdAt: now, updatedAt: now });

    return NextResponse.json(
      {
        budget: {
          id: ref.id,
          categoryId,
          monthlyLimit,
          month,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } satisfies Budget,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("[POST /api/budgets]", err);
    return NextResponse.json({ error: "Failed to create budget." }, { status: 500 });
  }
}
