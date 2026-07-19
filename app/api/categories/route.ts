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
        type:      d.type || "expense",
        icon:      d.icon,
        color:     d.color,
        isDefault: d.isDefault ?? false,
        createdAt: (d.createdAt as Timestamp).toDate().toISOString(),
      };
    });

    if (categories.length === 0) {
      // Auto-seed defaults
      const DEFAULT_CATEGORIES = [
        { name: "Bills",          type: "expense", icon: "receipt",          color: "#f59e0b" },
        { name: "Education",     type: "expense", icon: "school",           color: "#ef4444" },
        { name: "Entertainment", type: "expense", icon: "sports_esports",   color: "#d946ef" },
        { name: "Food & Dining", type: "expense", icon: "restaurant",       color: "#f97316" },
        { name: "Health",        type: "expense", icon: "favorite",         color: "#f59e0b" },
        { name: "Investment",    type: "expense", icon: "trending_up",      color: "#eab308" },
        { name: "Shopping",      type: "expense", icon: "shopping_bag",     color: "#06b6d4" },
        { name: "Travel",        type: "expense", icon: "flight",           color: "#06b6d4" },
        { name: "Transport",     type: "expense", icon: "directions_car",   color: "#3b82f6" },
        { name: "Housing",       type: "expense", icon: "home",             color: "#3b82f6" },
        { name: "Salary",        type: "income",  icon: "payments",         color: "#22c55e" },
        { name: "Freelance",     type: "income",  icon: "work",             color: "#10b981" },
        { name: "Interest",      type: "income",  icon: "account_balance",  color: "#14b8a6" },
        { name: "Gift",          type: "income",  icon: "redeem",           color: "#8b5cf6" },
        { name: "Other Income",  type: "income",  icon: "add_circle",       color: "#64748b" },
        { name: "Other",         type: "expense", icon: "category",         color: "#64748b" },
      ];
      
      const batch = db.batch();
      for (const cat of DEFAULT_CATEGORIES) {
        const ref = db.collection(`users/${uid}/categories`).doc();
        batch.set(ref, {
          name: cat.name,
          type: cat.type,
          icon: cat.icon,
          color: cat.color,
          isDefault: true,
          createdAt: FieldValue.serverTimestamp(),
        });
        categories.push({
          id: ref.id,
          name: cat.name,
          type: cat.type as "income" | "expense",
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

    const { name, type, icon, color } = parsed.data;
    const db = getAdminDb();
    const now = FieldValue.serverTimestamp();

    const ref = db.collection(`users/${uid}/categories`).doc();
    await ref.set({ name, type, icon, color, isDefault: false, createdAt: now });

    return NextResponse.json(
      {
        category: {
          id: ref.id,
          name,
          type,
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
