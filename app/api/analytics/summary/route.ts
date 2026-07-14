/**
 * app/api/analytics/summary/route.ts
 *
 * GET /api/analytics/summary?month=YYYY-MM
 *
 * Returns total income, total expense, and net for a calendar month.
 * If no month param, defaults to the current UTC month.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAuth } from "@/lib/firebase/session";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);

    const rawMonth = new URL(request.url).searchParams.get("month");
    // Default to current UTC month if not provided
    const month = rawMonth ?? new Date().toISOString().slice(0, 7);

    if (!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(month)) {
      return NextResponse.json(
        { error: "month must be in YYYY-MM format." },
        { status: 400 }
      );
    }

    const from = `${month}-01`;
    // Last day of month: day 0 of next month
    const [year, mon] = month.split("-").map(Number) as [number, number];
    const lastDay = new Date(Date.UTC(year, mon, 0)).getUTCDate();
    const to = `${month}-${String(lastDay).padStart(2, "0")}`;

    const db = getAdminDb();
    const snap = await db
      .collection(`users/${uid}/transactions`)
      .where("date", ">=", from)
      .where("date", "<=", to)
      .get();

    let totalIncome  = 0;
    let totalExpense = 0;
    let txCount      = 0;

    for (const doc of snap.docs) {
      const d = doc.data();
      if (d.type === "income")  totalIncome  += d.amount as number;
      if (d.type === "expense") totalExpense += d.amount as number;
      txCount++;
    }

    return NextResponse.json({
      month,
      totalIncome:  Math.round(totalIncome  * 100) / 100,
      totalExpense: Math.round(totalExpense * 100) / 100,
      net:          Math.round((totalIncome - totalExpense) * 100) / 100,
      txCount,
    });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("[GET /api/analytics/summary]", err);
    return NextResponse.json({ error: "Failed to compute summary." }, { status: 500 });
  }
}
