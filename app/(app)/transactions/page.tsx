"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/utils/fetcher";
import { useCurrency } from "@/components/CurrencyProvider";

const FILTERS = ["All", "Income", "Expense"];

export default function TransactionsPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const { data, error, isLoading, mutate } = useSWR("/api/transactions", fetcher);
  const { data: catData } = useSWR("/api/categories", fetcher);
  
  const TRANSACTIONS = data?.transactions || [];
  const categories = catData?.categories || [];
  const { format } = useCurrency();

  const getCatName = (id: string) => categories.find((c: any) => c.id === id)?.name || "Other";

  const filtered = TRANSACTIONS.filter((t: any) => {
    const matchType = activeFilter === "All" || t.type === activeFilter.toLowerCase();
    const catName = getCatName(t.categoryId);
    const searchString = search.toLowerCase();
    const matchSearch = (t.merchant || "").toLowerCase().includes(searchString) || 
                        catName.toLowerCase().includes(searchString) ||
                        (t.notes || "").toLowerCase().includes(searchString);
    return matchType && matchSearch;
  });

  const totalExpenses = TRANSACTIONS.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + t.amount, 0);
  const totalIncome = TRANSACTIONS.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + t.amount, 0);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this transaction? Your wallet balance will be adjusted accordingly.")) return;
    setDeleting(id);
    try {
      await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      mutate();
    } catch (e) { console.error(e); }
    setDeleting(null);
  };

  return (
    <div>
      <div className="page-header flex-between" style={{ flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1>Transactions</h1>
          <p>All your income and expenses in one place</p>
        </div>
        <Link href="/transactions/new" className="btn btn-primary" id="add-transaction-btn">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          Add Transaction
        </Link>
      </div>

      {/* ── Summary pills ──────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <div className="stat-card reveal" style={{ background: "var(--brand-green)", flex: "1 1 160px", minWidth: 0 }}>
          <div className="stat-card-label">Total Income</div>
          <div className="stat-card-value" style={{ fontSize: 24 }}>{format(totalIncome)}</div>
        </div>
        <div className="stat-card reveal" data-delay="100" style={{ background: "var(--brand-pink)", flex: "1 1 160px", minWidth: 0 }}>
          <div className="stat-card-label">Total Expenses</div>
          <div className="stat-card-value" style={{ fontSize: 24 }}>{format(totalExpenses)}</div>
        </div>
        <div className="stat-card reveal" data-delay="200" style={{ background: "var(--brand-yellow)", flex: "1 1 160px", minWidth: 0 }}>
          <div className="stat-card-label">Net</div>
          <div className="stat-card-value" style={{ fontSize: 24, color: totalIncome - totalExpenses >= 0 ? "#065f46" : "var(--error)" }}>
            {format(totalIncome - totalExpenses)}
          </div>
        </div>
      </div>

      {/* ── Filters + search ──────────────────────────────────────────────────── */}
      <div className="card reveal" style={{ padding: "1rem var(--card-padding)", marginBottom: "1rem" }}>
        <div className="flex-between" style={{ flexWrap: "wrap", gap: "0.75rem" }}>
          {/* Type filter */}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {FILTERS.map((f) => (
              <button
                key={f}
                id={`filter-${f.toLowerCase()}`}
                onClick={() => setActiveFilter(f)}
                className={activeFilter === f ? "btn btn-primary btn-sm" : "btn btn-secondary btn-sm"}
              >
                {f}
              </button>
            ))}
          </div>
          {/* Search */}
          <div className="search-input" style={{ maxWidth: 280 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: "var(--on-surface-variant)", flexShrink: 0 }}>search</span>
            <input
              type="search"
              placeholder="Search transactions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search transactions"
            />
          </div>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────────── */}
      <div className="card reveal" style={{ padding: 0, overflow: "hidden" }}>
        {isLoading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--on-surface-variant)" }}>
            <div className="spinner" style={{ margin: "0 auto 1rem" }} />
            Loading transactions...
          </div>
        ) : error ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--error)" }}>
            Failed to load transactions.
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined">search_off</span>
            <p>No transactions match your filter.</p>
          </div>
        ) : (
          <table className="clara-table">
            <thead>
              <tr>
                <th>Merchant</th>
                <th>Category</th>
                <th>Date</th>
                <th style={{ textAlign: "right" }}>Amount</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx: any) => {
                const icon = tx.type === "income" ? "arrow_downward" : "arrow_upward";
                const iconBg = tx.type === "income" ? "var(--brand-green)" : "var(--surface-variant)";
                const cat = categories.find((c: any) => c.id === tx.categoryId);
                return (
                  <tr key={tx.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: "var(--radius-full)",
                          background: cat ? `${cat.color}22` : iconBg, 
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 18, color: cat ? cat.color : "var(--primary)" }}>
                            {cat ? cat.icon : icon}
                          </span>
                        </div>
                        <div>
                          <span style={{ fontWeight: 500, display: "block", marginBottom: 2 }}>{tx.merchant || "Unknown"}</span>
                          {tx.notes && <span style={{ fontSize: 11, color: "var(--on-surface-variant)" }}>{tx.notes}</span>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${tx.type === "income" ? "green" : "grey"}`}>{getCatName(tx.categoryId)}</span>
                    </td>
                    <td style={{ color: "var(--on-surface-variant)", fontSize: 14 }}>{tx.date}</td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: tx.type === "income" ? "#065f46" : "var(--on-surface)", letterSpacing: "-0.01em" }}>
                      {tx.type === "income" ? "+" : "−"}{format(tx.amount, tx.currency)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button 
                        className="btn btn-ghost btn-icon" 
                        aria-label="Delete transaction" 
                        style={{ color: "var(--error)" }}
                        onClick={() => handleDelete(tx.id)}
                        disabled={deleting === tx.id}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                          {deleting === tx.id ? "hourglass_empty" : "delete"}
                        </span>
                      </button>
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
