/**
 * app/api/analytics/budget-vs-actual/route.ts
 *
 * GET /api/analytics/budget-vs-actual?month=YYYY-MM
 *
 * For each budget in the given month, returns:
 *   - monthlyLimit (the cap)
 *   - actualSpend  (sum of expenses in that category in that month)
 *   - remaining    (limit - actual, can be negative = over budget)
 *   - percentUsed  (0–100+)
 *
 * Used to power the budget-vs-actual bar chart (context.md §3.5).
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAuth } from "@/lib/firebase/session";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { uid } = await requireAuth(request);

    const rawMonth = new URL(request.url).searchParams.get("month");
    const month    = rawMonth ?? new Date().toISOString().slice(0, 7);

    if (!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(month)) {
      return NextResponse.json(
        { error: "month must be in YYYY-MM format." },
        { status: 400 }
      );
    }

    const [year, mon] = month.split("-").map(Number) as [number, number];
    const from = `${month}-01`;
    const lastDay = new Date(Date.UTC(year, mon, 0)).getUTCDate();
    const to = `${month}-${String(lastDay).padStart(2, "0")}`;

    const db = getAdminDb();

    // Fetch all budgets for this month
    const budgetsSnap = await db
      .collection(`users/${uid}/budgets`)
      .where("month", "==", month)
      .get();

    if (budgetsSnap.empty) {
      return NextResponse.json({ month, budgets: [] });
    }

    // Collect all category IDs we need to sum
    const budgets = budgetsSnap.docs.map((d) => ({
      id:           d.id,
      categoryId:   d.data().categoryId as string,
      monthlyLimit: d.data().monthlyLimit as number,
    }));

    // Fetch all expenses in the month that belong to budgeted categories
    const categoryIds = budgets.map((b) => b.categoryId);

    // Firestore `in` operator supports up to 30 values per query
    const CHUNK_SIZE = 30;
    const spendByCategory = new Map<string, number>();

    for (let i = 0; i < categoryIds.length; i += CHUNK_SIZE) {
      const chunk = categoryIds.slice(i, i + CHUNK_SIZE);
      const txSnap = await db
        .collection(`users/${uid}/transactions`)
        .where("type", "==", "expense")
        .where("categoryId", "in", chunk)
        .where("date", ">=", from)
        .where("date", "<=", to)
        .get();

      for (const doc of txSnap.docs) {
        const d          = doc.data();
        const cid        = d.categoryId as string;
        const amount     = d.amount as number;
        spendByCategory.set(cid, (spendByCategory.get(cid) ?? 0) + amount);
      }
    }

    const result = budgets.map((b) => {
      const actual  = Math.round((spendByCategory.get(b.categoryId) ?? 0) * 100) / 100;
      const remaining   = Math.round((b.monthlyLimit - actual) * 100) / 100;
      const percentUsed = b.monthlyLimit > 0
        ? Math.round((actual / b.monthlyLimit) * 10000) / 100
        : 0;

      return {
        budgetId:     b.id,
        categoryId:   b.categoryId,
        monthlyLimit: b.monthlyLimit,
        actualSpend:  actual,
        remaining,
        percentUsed,
        isOverBudget: actual > b.monthlyLimit,
      };
    });

    return NextResponse.json({ month, budgets: result });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("[GET /api/analytics/budget-vs-actual]", err);
    return NextResponse.json({ error: "Failed to compute budget vs actual." }, { status: 500 });
  }
}
