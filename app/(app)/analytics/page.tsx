"use client";

import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/utils/fetcher";
import { useCurrency } from "@/components/CurrencyProvider";

function NetWorthRing({ value }: { value: number }) {
  const r = 60, c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  return (
    <svg viewBox="0 0 140 140" width="140" height="140">
      <circle cx="70" cy="70" r={r} fill="none" stroke="var(--surface-variant)" strokeWidth="10" />
      <circle
        cx="70" cy="70" r={r} fill="none"
        stroke="var(--brand-green)" strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`}
        transform="rotate(-90 70 70)"
        style={{ transition: "stroke-dasharray 1s var(--ease-out-expo)" }}
      />
      <text x="70" y="65" textAnchor="middle" style={{ fontSize: 18, fontWeight: 700, fill: "var(--on-surface)" }}>72%</text>
      <text x="70" y="82" textAnchor="middle" style={{ fontSize: 11, fill: "var(--on-surface-variant)" }}>On Track</text>
    </svg>
  );
}

export default function AnalyticsPage() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(year, d.getMonth() + 1, 0).getDate();
  
  const from = `${year}-${month}-01`;
  const to = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;

  const { data: summaryData } = useSWR("/api/analytics/summary", fetcher);
  const { data: trendData } = useSWR("/api/analytics/trend?months=6", fetcher);
  const { data: categoryData } = useSWR(`/api/analytics/by-category?from=${from}&to=${to}&type=expense`, fetcher);
  const { data: categories } = useSWR("/api/categories", fetcher);
  
  const { format } = useCurrency();

  const summary = summaryData || { totalIncome: 0, totalExpense: 0, net: 0 };
  const trend = trendData?.trend || [];
  
  const MONTHS = trend.map((t: any) => {
    const [y, m] = t.month.split("-");
    const date = new Date(Number(y), Number(m) - 1);
    return date.toLocaleString("default", { month: "short" });
  });
  const SPENDING = trend.map((t: any) => t.totalExpense);
  const INCOME = trend.map((t: any) => t.totalIncome);
  const SAVINGS = trend.map((t: any) => t.net);

  const maxSpend = Math.max(...SPENDING, 1);
  const maxIncome = Math.max(...INCOME, 1);

  const cats = categories?.categories || [];
  const CATEGORY_DATA = (categoryData?.breakdown || []).map((b: any) => {
    const cat = cats.find((c: any) => c.id === b.categoryId) || { name: "Other", color: "var(--brand-blue)" };
    return {
      name: cat.name,
      amount: format(b.total),
      pct: b.percentage,
      color: cat.color,
    };
  });

  return (
    <div>
      <div className="page-header">
        <h1>Analytics & Insights</h1>
        <p>A deep look at your financial health and spending patterns</p>
      </div>

      {/* ── KPI row ────────────────────────────────────────────────────────────── */}
      <div className="stat-grid reveal" style={{ marginBottom: "var(--gutter)" }}>
        {[
          { label: "Net Cash Flow",   value: format(summary.net),  bg: "var(--brand-yellow)", trend: summary.net >= 0 ? "Positive" : "Negative" },
          { label: "Total Income",    value: format(summary.totalIncome),  bg: "var(--brand-green)",  trend: "This month" },
          { label: "Total Expenses",  value: format(summary.totalExpense), bg: "var(--brand-pink)",   trend: "This month" },
          { label: "Top Category",    value: CATEGORY_DATA[0]?.name || "-",   bg: "var(--brand-blue)",   trend: CATEGORY_DATA[0]?.amount || "No data" },
        ].map((k, i) => (
          <div key={k.label} className="stat-card reveal" data-delay={`${i * 50}` as "50" | "100" | "150" | "200" | "250" | "300"} style={{ background: k.bg }}>
            <div className="stat-card-label">{k.label}</div>
            <div className="stat-card-value" style={{ fontSize: 26 }}>{k.value}</div>
            <div className="stat-card-trend" style={{ color: "#065f46" }}>{k.trend}</div>
          </div>
        ))}
      </div>

      {/* ── Charts row ─────────────────────────────────────────────────────────── */}
      <div className="content-grid-2-1" style={{ marginBottom: "var(--gutter)" }}>
        {/* Spending vs Income bar chart */}
        <div className="card reveal">
          <div className="flex-between" style={{ marginBottom: "1.5rem" }}>
            <h2 className="text-headline-sm">Spending vs Income</h2>
            <div style={{ display: "flex", gap: "1rem" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--on-surface-variant)" }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--brand-pink)", display: "inline-block" }} /> Spending
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--on-surface-variant)" }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--brand-green)", display: "inline-block" }} /> Income
              </span>
            </div>
          </div>
          {MONTHS.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 180 }}>
              <p style={{ color: "var(--on-surface-variant)", fontSize: 14 }}>Not enough data to display trend.</p>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "flex-end", gap: "1rem", height: 180 }}>
              {MONTHS.map((month: string, i: number) => (
                <div key={month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%" }}>
                  <div style={{ flex: 1, width: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 3 }}>
                    <div style={{ width: "100%", height: `${(SPENDING[i] / Math.max(maxSpend, maxIncome)) * 100}%`, background: "var(--brand-pink)", borderRadius: "4px 4px 0 0", minHeight: 4, transition: "height 0.8s var(--ease-out-expo)" }} />
                    <div style={{ width: "100%", height: `${(INCOME[i] / Math.max(maxSpend, maxIncome)) * 100}%`, background: "var(--brand-green)", borderRadius: "4px 4px 0 0", minHeight: 4, transition: "height 0.8s var(--ease-out-expo)" }} />
                  </div>
                  <span className="text-label-caps" style={{ color: "var(--on-surface-variant)", fontSize: 9 }}>{month}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category donut + breakdown */}
        <div className="card reveal" data-delay="100">
          <h2 className="text-headline-sm" style={{ marginBottom: "1.25rem" }}>By Category</h2>
          {CATEGORY_DATA.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 180 }}>
              <p style={{ color: "var(--on-surface-variant)", fontSize: 14 }}>No categories to display.</p>
            </div>
          ) : (
            <>
              <div className="flex-center" style={{ marginBottom: "1.25rem" }}>
                <NetWorthRing value={72} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {CATEGORY_DATA.map((cat: any, i: number) => (
                  <div key={`${cat.name}-${i}`}>
                    <div className="flex-between" style={{ marginBottom: "0.25rem" }}>
                      <span style={{ fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: cat.color, display: "inline-block" }} />
                        {cat.name}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{cat.amount} <span style={{ fontWeight: 400, color: "var(--on-surface-variant)" }}>({cat.pct}%)</span></span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${cat.pct}%`, background: cat.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Monthly trend table ────────────────────────────────────────────────── */}
      <div className="card reveal">
        <div className="flex-between" style={{ marginBottom: "1.25rem" }}>
          <h2 className="text-headline-sm">Monthly Breakdown</h2>
          <Link href="/reports" className="btn btn-secondary btn-sm">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
            Export PDF
          </Link>
        </div>
        {MONTHS.length === 0 ? (
          <div style={{ padding: "3rem 0", textAlign: "center" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 32, color: "var(--outline-variant)", marginBottom: "0.5rem" }}>calendar_month</span>
            <p style={{ color: "var(--on-surface-variant)", fontSize: 14 }}>No data available yet.</p>
          </div>
        ) : (
          <table className="clara-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Income</th>
                <th>Expenses</th>
                <th>Savings</th>
                <th>Rate</th>
              </tr>
            </thead>
            <tbody>
              {MONTHS.map((month: string, i: number) => {
                const savings = SAVINGS[i];
                const rate = INCOME[i] > 0 ? Math.round((savings / INCOME[i]) * 100) : 0;
                return (
                  <tr key={month}>
                    <td style={{ fontWeight: 500 }}>{month}</td>
                    <td style={{ color: "#065f46", fontWeight: 600 }}>{format(INCOME[i])}</td>
                    <td style={{ fontWeight: 600 }}>{format(SPENDING[i])}</td>
                    <td style={{ fontWeight: 600 }}>{format(savings)}</td>
                    <td>
                      <span className={`badge ${rate >= 30 ? "badge-green" : rate >= 15 ? "badge-yellow" : "badge-red"}`}>{rate}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
