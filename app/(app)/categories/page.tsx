"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/utils/fetcher";

export default function CategoriesPage() {
  // revalidateOnFocus ensures new categories appear when returning from /categories/new
  const { data, error, isLoading, mutate } = useSWR("/api/categories", fetcher, { revalidateOnFocus: true });
  const [deleting, setDeleting] = useState<string | null>(null);
  
  const categories = data?.categories || [];
  const expenseCategories = categories.filter((c: any) => c.type === "expense" || !c.type);
  const incomeCategories = categories.filter((c: any) => c.type === "income");

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category? It cannot be deleted if transactions or budgets are linked to it.")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const result = await res.json();
        alert(result.error || "Failed to delete category.");
      } else {
        mutate();
      }
    } catch (e) { console.error(e); }
    setDeleting(null);
  };

  const renderCategoryGrid = (items: any[], title: string, titleColor: string, emptyMsg: string) => (
    <div style={{ marginBottom: "2rem" }}>
      <h2 className="text-headline-sm" style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span className="material-symbols-outlined" style={{ fontSize: 20, color: titleColor }}>
          {title === "Expense" ? "arrow_upward" : "arrow_downward"}
        </span>
        {title} Categories
        <span style={{ fontSize: 13, fontWeight: 400, color: "var(--on-surface-variant)", marginLeft: "0.25rem" }}>
          ({items.length})
        </span>
      </h2>
      {items.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "2rem", color: "var(--on-surface-variant)" }}>
          {emptyMsg}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
          {items.map((c: any) => (
            <div key={c.id} className="card reveal" style={{ 
              padding: "1.25rem", 
              display: "flex", 
              alignItems: "center", 
              gap: "1rem",
              border: `1.5px solid ${c.color}33`,
            }}>
              <div style={{ 
                width: 52, height: 52, borderRadius: "var(--radius-md)", 
                background: `${c.color}22`, 
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 26, color: c.color }}>{c.icon}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{c.name}</p>
                <div style={{ display: "flex", gap: "0.375rem", alignItems: "center" }}>
                  <span style={{ 
                    fontSize: 10, fontWeight: 600,
                    background: c.type === "income" ? "#dcfce7" : "#fce7f3",
                    color: c.type === "income" ? "#065f46" : "#9d174d",
                    padding: "2px 8px", borderRadius: 20,
                  }}>
                    {c.type === "income" ? "Income" : "Expense"}
                  </span>
                  {c.isDefault && (
                    <span style={{ fontSize: 10, background: "var(--surface-variant)", color: "var(--on-surface-variant)", padding: "2px 8px", borderRadius: 20 }}>
                      Default
                    </span>
                  )}
                </div>
              </div>
              {!c.isDefault && (
                <button 
                  className="btn btn-ghost btn-icon" 
                  onClick={() => handleDelete(c.id)}
                  disabled={deleting === c.id}
                  style={{ color: "var(--error)", flexShrink: 0 }}
                  title="Delete category"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    {deleting === c.id ? "hourglass_empty" : "delete"}
                  </span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="page-header flex-between" style={{ flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1>Categories</h1>
          <p>Organize your transactions with custom categories</p>
        </div>
        <Link href="/categories/new" className="btn btn-primary">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          New Category
        </Link>
      </div>

      {isLoading ? (
        <div style={{ padding: "3rem 0", textAlign: "center" }}>
          <div className="spinner" style={{ margin: "0 auto 1rem" }} />
          <p style={{ color: "var(--on-surface-variant)", fontSize: 14 }}>Loading categories...</p>
        </div>
      ) : error ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--error)" }}>
          Failed to load categories.
        </div>
      ) : (
        <div className="reveal">
          {renderCategoryGrid(expenseCategories, "Expense", "#f97316", "No expense categories yet. Click 'New Category' to add one.")}
          {renderCategoryGrid(incomeCategories, "Income", "#22c55e", "No income categories yet. Click 'New Category' to add one.")}
        </div>
      )}
    </div>
  );
}
