/**
 * app/api/analytics/by-category/route.ts
 *
 * GET /api/analytics/by-category?from=YYYY-MM-DD&to=YYYY-MM-DD&type=expense
 *
 * Returns total spend per category for a date range and transaction type.
 * Used to power the category pie/bar chart (context.md §3.5).
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAuth } from "@/lib/firebase/session";

interface CategoryTotal {
  categoryId:   string;
  total:        number;
  txCount:      number;
  percentage:   number;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);

    const params = new URL(request.url).searchParams;
    const from   = params.get("from");
    const to     = params.get("to");
    const type   = params.get("type") ?? "expense";

    if (!from || !to) {
      return NextResponse.json(
        { error: "from and to query parameters are required (YYYY-MM-DD)." },
        { status: 400 }
      );
    }
    if (type !== "expense" && type !== "income") {
      return NextResponse.json(
        { error: "type must be 'expense' or 'income'." },
        { status: 400 }
      );
    }

    const db   = getAdminDb();
    const snap = await db
      .collection(`users/${uid}/transactions`)
      .where("type", "==", type)
      .where("date", ">=", from)
      .where("date", "<=", to)
      .get();

    // Aggregate by categoryId
    const totals = new Map<string, { total: number; txCount: number }>();
    let grandTotal = 0;

    for (const doc of snap.docs) {
      const d          = doc.data();
      const categoryId = (d.categoryId as string) || "__uncategorized__";
      const amount     = d.amount as number;

      const existing = totals.get(categoryId) ?? { total: 0, txCount: 0 };
      existing.total   += amount;
      existing.txCount += 1;
      totals.set(categoryId, existing);
      grandTotal += amount;
    }

    const breakdown: CategoryTotal[] = Array.from(totals.entries())
      .map(([categoryId, { total, txCount }]) => ({
        categoryId,
        total:      Math.round(total * 100) / 100,
        txCount,
        percentage: grandTotal > 0
          ? Math.round((total / grandTotal) * 10000) / 100
          : 0,
      }))
      .sort((a, b) => b.total - a.total);

    return NextResponse.json({
      from, to, type,
      grandTotal: Math.round(grandTotal * 100) / 100,
      breakdown,
    });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("[GET /api/analytics/by-category]", err);
    return NextResponse.json({ error: "Failed to compute category breakdown." }, { status: 500 });
  }
}
