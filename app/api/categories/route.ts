/**
 * app/api/categories/route.ts
 *
 * GET  /api/categories  — list all categories (defaults + custom)
 * POST /api/categories  — create a custom category
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAuth } from "@/lib/firebase/session";
import { CreateCategorySchema } from "@/lib/validation/category";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { Category } from "@/lib/types";

// ── GET /api/categories ───────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);
    const db = getAdminDb();

    const snapshot = await db
      .collection(`users/${uid}/categories`)
      .orderBy("name", "asc")
      .get();

    let categories: Category[] = snapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        id:        doc.id,
        name:      d.name,
        icon:      d.icon,
        color:     d.color,
        isDefault: d.isDefault ?? false,
        createdAt: (d.createdAt as Timestamp).toDate().toISOString(),
      };
    });

    if (categories.length === 0) {
      // Auto-seed defaults
      const DEFAULT_CATEGORIES = [
        { name: "Housing", type: "expense", icon: "home", color: "#3b82f6" },
        { name: "Food", type: "expense", icon: "restaurant", color: "#ec4899" },
        { name: "Transport", type: "expense", icon: "directions_car", color: "#eab308" },
        { name: "Health", type: "expense", icon: "favorite", color: "#22c55e" },
        { name: "Salary", type: "income", icon: "payments", color: "#22c55e" },
        { name: "Other", type: "expense", icon: "category", color: "#64748b" },
      ];
      
      const batch = db.batch();
      for (const cat of DEFAULT_CATEGORIES) {
        const ref = db.collection(`users/${uid}/categories`).doc();
        batch.set(ref, {
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          isDefault: true,
          createdAt: FieldValue.serverTimestamp(),
        });
        categories.push({
          id: ref.id,
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          isDefault: true,
          createdAt: new Date().toISOString(),
        });
      }
      await batch.commit();
    }

    return NextResponse.json({ categories });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("[GET /api/categories]", err);
    return NextResponse.json({ error: "Failed to fetch categories." }, { status: 500 });
  }
}

// ── POST /api/categories ──────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const parsed = CreateCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed.", issues: parsed.error.issues },
        { status: 422 }
      );
    }

    const { name, icon, color } = parsed.data;
    const db = getAdminDb();
    const now = FieldValue.serverTimestamp();

    const ref = db.collection(`users/${uid}/categories`).doc();
    await ref.set({ name, icon, color, isDefault: false, createdAt: now });

    return NextResponse.json(
      {
        category: {
          id: ref.id,
          name,
          icon,
          color,
          isDefault: false,
          createdAt: new Date().toISOString(),
        } satisfies Category,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("[POST /api/categories]", err);
    return NextResponse.json({ error: "Failed to create category." }, { status: 500 });
  }
}
