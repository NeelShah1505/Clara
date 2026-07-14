/**
 * app/api/analytics/trend/route.ts
 *
 * GET /api/analytics/trend?months=6
 *
 * Returns monthly income and expense totals for the last N calendar months
 * (including the current month). Used to power the income-vs-expense trend
 * line chart (context.md §3.5).
 *
 * Returns months in ascending chronological order so the chart renders
 * left-to-right.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAuth } from "@/lib/firebase/session";

interface MonthDataPoint {
  month:        string;   // "YYYY-MM"
  totalIncome:  number;
  totalExpense: number;
  net:          number;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);

    const rawMonths = new URL(request.url).searchParams.get("months");
    const numMonths = Math.min(Math.max(Number(rawMonths ?? 6), 1), 24);

    // Build the list of months to query (oldest first)
    const months: string[] = [];
    const now = new Date();
    for (let i = numMonths - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
    }

    // Date range spans from start of oldest month to end of current month
    const from     = `${months[0]}-01`;
    const lastMon  = months[months.length - 1]!;
    const [ly, lm] = lastMon.split("-").map(Number) as [number, number];
    const lastDay  = new Date(Date.UTC(ly, lm, 0)).getUTCDate();
    const to       = `${lastMon}-${String(lastDay).padStart(2, "0")}`;

    const db   = getAdminDb();
    const snap = await db
      .collection(`users/${uid}/transactions`)
      .where("date", ">=", from)
      .where("date", "<=", to)
      .get();

    // Initialise all months to zero so months with no transactions still appear
    const dataMap = new Map<string, { income: number; expense: number }>(
      months.map((m) => [m, { income: 0, expense: 0 }])
    );

    for (const doc of snap.docs) {
      const d     = doc.data();
      const month = (d.date as string).slice(0, 7); // "YYYY-MM"
      if (!dataMap.has(month)) continue;            // outside our window (shouldn't happen)

      const entry = dataMap.get(month)!;
      if (d.type === "income")  entry.income  += d.amount as number;
      if (d.type === "expense") entry.expense += d.amount as number;
    }

    const trend: MonthDataPoint[] = months.map((month) => {
      const { income, expense } = dataMap.get(month)!;
      return {
        month,
        totalIncome:  Math.round(income  * 100) / 100,
        totalExpense: Math.round(expense * 100) / 100,
        net:          Math.round((income - expense) * 100) / 100,
      };
    });

    return NextResponse.json({ months: numMonths, trend });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("[GET /api/analytics/trend]", err);
    return NextResponse.json({ error: "Failed to compute trend." }, { status: 500 });
  }
}
