/**
 * app/api/analytics/top-merchants/route.ts
 *
 * GET /api/analytics/top-merchants?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=10
 *
 * Returns top merchants by total expense spend in a date range.
 * Used to power the "Top Merchants" widget (context.md §3.5).
 * Empty merchant strings are grouped as "__unknown__".
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAuth } from "@/lib/firebase/session";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);

    const params  = new URL(request.url).searchParams;
    const from    = params.get("from");
    const to      = params.get("to");
    const limit   = Math.min(Number(params.get("limit") ?? 10), 50);

    if (!from || !to) {
      return NextResponse.json(
        { error: "from and to query parameters are required (YYYY-MM-DD)." },
        { status: 400 }
      );
    }

    const db   = getAdminDb();
    const snap = await db
      .collection(`users/${uid}/transactions`)
      .where("type", "==", "expense")
      .where("date", ">=", from)
      .where("date", "<=", to)
      .get();

    // Aggregate by merchant name
    const totals = new Map<string, { total: number; txCount: number }>();
    let grandTotal = 0;

    for (const doc of snap.docs) {
      const d        = doc.data();
      const merchant = ((d.merchant as string) || "").trim() || "__unknown__";
      const amount   = d.amount as number;

      const existing  = totals.get(merchant) ?? { total: 0, txCount: 0 };
      existing.total   += amount;
      existing.txCount += 1;
      totals.set(merchant, existing);
      grandTotal += amount;
    }

    const merchants = Array.from(totals.entries())
      .map(([merchant, { total, txCount }]) => ({
        merchant,
        total:      Math.round(total * 100) / 100,
        txCount,
        percentage: grandTotal > 0
          ? Math.round((total / grandTotal) * 10000) / 100
          : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);

    return NextResponse.json({
      from, to, limit,
      grandTotal: Math.round(grandTotal * 100) / 100,
      merchants,
    });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("[GET /api/analytics/top-merchants]", err);
    return NextResponse.json({ error: "Failed to compute top merchants." }, { status: 500 });
  }
}
