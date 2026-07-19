/**
 * app/api/categories/[categoryId]/route.ts
 *
 * GET    /api/categories/:id  — fetch a single category
 * PATCH  /api/categories/:id  — update name/icon/color (all categories updatable)
 * DELETE /api/categories/:id  — blocks default categories; blocks if transactions reference it
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAuth } from "@/lib/firebase/session";
import { UpdateCategorySchema } from "@/lib/validation/category";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { Category } from "@/lib/types";

type Params = { params: Promise<{ categoryId: string }> };

// ── GET /api/categories/:id ───────────────────────────────────────────────────

export async function GET(request: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);
    const { categoryId } = await params;
    const db = getAdminDb();

    const doc = await db.doc(`users/${uid}/categories/${categoryId}`).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Category not found." }, { status: 404 });
    }

    const d = doc.data()!;
    const category: Category = {
      id:        doc.id,
      name:      d.name,
      icon:      d.icon,
      color:     d.color,
      type:      d.type ?? "expense",
      isDefault: d.isDefault ?? false,
      createdAt: (d.createdAt as Timestamp).toDate().toISOString(),
    };

    return NextResponse.json({ category });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("[GET /api/categories/:id]", err);
    return NextResponse.json({ error: "Failed to fetch category." }, { status: 500 });
  }
}

// ── PATCH /api/categories/:id ─────────────────────────────────────────────────

export async function PATCH(request: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);
    const { categoryId } = await params;

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const parsed = UpdateCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed.", issues: parsed.error.issues },
        { status: 422 }
      );
    }

    const db = getAdminDb();
    const ref = db.doc(`users/${uid}/categories/${categoryId}`);
    const existing = await ref.get();

    if (!existing.exists) {
      return NextResponse.json({ error: "Category not found." }, { status: 404 });
    }

    // Both default and custom categories can have name/icon/color updated.
    // isDefault is NOT in the update schema so it can never be changed via API.
    await ref.update({ ...parsed.data, updatedAt: FieldValue.serverTimestamp() });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("[PATCH /api/categories/:id]", err);
    return NextResponse.json({ error: "Failed to update category." }, { status: 500 });
  }
}

// ── DELETE /api/categories/:id ────────────────────────────────────────────────

export async function DELETE(request: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);
    const { categoryId } = await params;
    const db = getAdminDb();

    const ref = db.doc(`users/${uid}/categories/${categoryId}`);
    const existing = await ref.get();

    if (!existing.exists) {
      return NextResponse.json({ error: "Category not found." }, { status: 404 });
    }

    // Block deletion of default categories
    if (existing.data()?.isDefault === true) {
      return NextResponse.json(
        { error: "Default categories cannot be deleted." },
        { status: 409 }
      );
    }

    // Block deletion if any transaction references this category
    const linkedTx = await db
      .collection(`users/${uid}/transactions`)
      .where("categoryId", "==", categoryId)
      .limit(1)
      .get();

    if (!linkedTx.empty) {
      return NextResponse.json(
        {
          error:
            "Cannot delete a category that has transactions. " +
            "Re-assign or delete all transactions using this category first.",
        },
        { status: 409 }
      );
    }

    // Also block if a budget references this category
    const linkedBudget = await db
      .collection(`users/${uid}/budgets`)
      .where("categoryId", "==", categoryId)
      .limit(1)
      .get();

    if (!linkedBudget.empty) {
      return NextResponse.json(
        { error: "Cannot delete a category that has budgets. Delete the budgets first." },
        { status: 409 }
      );
    }

    await ref.delete();
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("[DELETE /api/categories/:id]", err);
    return NextResponse.json({ error: "Failed to delete category." }, { status: 500 });
  }
}
