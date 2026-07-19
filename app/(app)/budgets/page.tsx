"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/utils/fetcher";
import { useCurrency } from "@/components/CurrencyProvider";

export default function BudgetsPage() {
  const { data: budgetData, isLoading: budgetsLoading, mutate } = useSWR("/api/budgets", fetcher);
  const { data: budgetActualData } = useSWR("/api/analytics/budget-vs-actual", fetcher);
  const { data: categoriesData, isLoading: categoriesLoading } = useSWR("/api/categories", fetcher);
  const { format } = useCurrency();

  const [deleting, setDeleting] = useState<string | null>(null);

  const budgets = budgetData?.budgets || [];
  const actuals = budgetActualData?.budgets || [];
  const categories = categoriesData?.categories || [];

  // Merge budget data with actuals
  const BUDGETS = budgets.map((b: any) => {
    const cat = categories.find((c: any) => c.id === b.categoryId) || { name: b.categoryId, icon: "category", color: "var(--brand-blue)" };
    const actual = actuals.find((a: any) => a.budgetId === b.id);
    return {
      id: b.id,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      limit: b.monthlyLimit,
      spent: actual?.actualSpend || 0,
      month: b.month,
    };
  });

  const totalLimit = BUDGETS.reduce((s: number, b: any) => s + b.limit, 0);
  const totalSpent = BUDGETS.reduce((s: number, b: any) => s + b.spent, 0);
  const overBudget = BUDGETS.filter((b: any) => b.spent > b.limit);

  const isLoading = budgetsLoading || categoriesLoading;

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this budget?")) return;
    setDeleting(id);
    try {
      await fetch(`/api/budgets/${id}`, { method: "DELETE" });
      mutate();
    } catch (e) { console.error(e); }
    setDeleting(null);
  };

  return (
    <div>
      <div className="page-header flex-between" style={{ flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1>Budgets</h1>
          <p>Set limits and stay on track across every category</p>
        </div>
        <Link href="/budgets/new" className="btn btn-primary" id="add-budget-btn">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          New Budget
        </Link>
      </div>

      {/* ── Summary ──────────────────────────────────────────────────────────── */}
      <div className="stat-grid reveal" style={{ marginBottom: "var(--gutter)" }}>
        <div className="stat-card card-yellow">
          <div className="stat-card-label">Total Budget</div>
          <div className="stat-card-value" style={{ fontSize: 26 }}>{format(totalLimit)}</div>
        </div>
        <div className="stat-card card-pink">
          <div className="stat-card-label">Total Spent</div>
          <div className="stat-card-value" style={{ fontSize: 26 }}>{format(totalSpent)}</div>
        </div>
        <div className="stat-card card-green">
          <div className="stat-card-label">Remaining</div>
          <div className="stat-card-value" style={{ fontSize: 26 }}>{format(totalLimit - totalSpent)}</div>
        </div>
        <div className="stat-card" style={{ background: overBudget.length > 0 ? "var(--error-container)" : "var(--brand-green)" }}>
          <div className="stat-card-label">Over Budget</div>
          <div className="stat-card-value" style={{ fontSize: 26, color: overBudget.length > 0 ? "var(--error)" : "#065f46" }}>{overBudget.length}</div>
          <div className="stat-card-trend" style={{ color: "var(--on-surface-variant)" }}>{overBudget.length === 0 ? "All on track ✓" : "categories"}</div>
        </div>
      </div>

      {/* ── Budget cards grid ────────────────────────────────────────────────── */}
      {isLoading ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--on-surface-variant)" }}>
          Loading budgets...
        </div>
      ) : BUDGETS.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: "var(--outline-variant)", marginBottom: "1rem", display: "block" }}>pie_chart</span>
          <p style={{ color: "var(--on-surface-variant)", marginBottom: "1rem" }}>You haven't set up any budgets yet.</p>
          <Link href="/budgets/new" className="btn btn-primary">Create Your First Budget</Link>
        </div>
      ) : (
        <div className="content-grid-3" style={{ marginBottom: "var(--gutter)" }}>
          {BUDGETS.map((b: any, i: number) => {
            const pct = Math.min((b.spent / b.limit) * 100, 100);
            const over = b.spent > b.limit;
            return (
              <div key={b.id} className="card reveal" data-delay={`${(i % 3) * 100}`}>
                <div className="flex-between" style={{ marginBottom: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                    <div style={{ width: 40, height: 40, borderRadius: "var(--radius-md)", background: over ? "var(--error-container)" : `${b.color}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: over ? "var(--error)" : b.color }}>{b.icon}</span>
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600 }}>{b.name}</p>
                      <p style={{ fontSize: 11, color: "var(--on-surface-variant)" }}>{b.month}</p>
                      {over && <span className="badge badge-red" style={{ marginTop: 2 }}>Over budget</span>}
                    </div>
                  </div>
                  <button 
                    className="btn btn-ghost btn-icon" 
                    onClick={() => handleDelete(b.id)}
                    disabled={deleting === b.id}
                    style={{ color: "var(--error)" }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                  </button>
                </div>

                {/* Progress */}
                <div className="progress-track" style={{ height: 8, marginBottom: "0.625rem" }}>
                  <div className="progress-fill" style={{ width: `${pct}%`, background: over ? "var(--error)" : b.color }} />
                </div>

                <div className="flex-between">
                  <span style={{ fontSize: 13, color: "var(--on-surface-variant)" }}>
                    {format(b.spent)} spent
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: over ? "var(--error)" : "var(--on-surface)" }}>
                    {format(b.limit)} limit
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
