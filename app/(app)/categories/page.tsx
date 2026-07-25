"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/utils/fetcher";
import { resolveMaterialIcon, CURATED_MATERIAL_ICONS } from "@/lib/utils/iconResolver";

export default function CategoriesPage() {
  const { data, error, isLoading, mutate } = useSWR("/api/categories", fetcher, { revalidateOnFocus: true });
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [updatingIcon, setUpdatingIcon] = useState(false);

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

  const handleIconSelect = async (newIcon: string) => {
    if (!editingCategory) return;
    setUpdatingIcon(true);
    try {
      const res = await fetch(`/api/categories/${editingCategory.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ icon: newIcon }),
      });
      if (!res.ok) {
        alert("Failed to update icon.");
      } else {
        mutate();
        setEditingCategory(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingIcon(false);
    }
  };

  const renderCategoryGrid = (items: any[], title: string, titleColor: string, emptyMsg: string) => (
    <div style={{ marginBottom: "2.5rem" }}>
      <h2 className="text-headline-sm" style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span className="material-symbols-outlined" style={{ fontSize: 22, color: titleColor }}>
          {title === "Expense" ? "arrow_upward" : "arrow_downward"}
        </span>
        {title} Categories
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--on-surface-variant)", marginLeft: "0.25rem" }}>
          ({items.length})
        </span>
      </h2>
      {items.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "2.5rem", color: "var(--on-surface-variant)" }}>
          {emptyMsg}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: "1.25rem" }}>
          {items.map((c: any) => {
            const displayIcon = resolveMaterialIcon(c.icon || c.name, c.type === "income" ? "income" : "expense");
            
            return (
              <div key={c.id} className="card reveal" style={{ 
                padding: "1.25rem", 
                display: "flex", 
                alignItems: "center", 
                gap: "1.25rem",
                border: `1px solid var(--outline-variant)`,
                background: "var(--surface-container-lowest)",
                transition: "all 0.2s",
                position: "relative"
              }}>
                {/* Styled Material Icon Box */}
                <button 
                  onClick={() => setEditingCategory(c)}
                  title="Click to select from 40+ Material icons"
                  style={{ 
                    width: 56, height: 56, borderRadius: "14px", 
                    background: `${c.color || "#8B5CF6"}1A`, 
                    border: `1.5px solid ${c.color || "#8B5CF6"}40`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                    cursor: "pointer",
                    transition: "transform 0.15s",
                    overflow: "hidden"
                  }}
                  onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.06)")}
                  onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 28, color: c.color || "#8B5CF6" }}>
                    {displayIcon}
                  </span>
                </button>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, color: "var(--on-surface)", truncate: true } as any}>{c.name}</p>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ 
                      fontSize: 11, fontWeight: 600,
                      background: c.type === "income" ? "#dcfce7" : "#fce7f3",
                      color: c.type === "income" ? "#065f46" : "#9d174d",
                      padding: "2px 10px", borderRadius: 20,
                    }}>
                      {c.type === "income" ? "Income" : "Expense"}
                    </span>
                  </div>
                </div>

                {!c.isDefault && (
                  <button 
                    className="btn btn-ghost btn-icon" 
                    onClick={() => handleDelete(c.id)}
                    disabled={deleting === c.id}
                    style={{ color: "var(--error)", flexShrink: 0, opacity: 0.8 }}
                    title="Delete category"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                      {deleting === c.id ? "hourglass_empty" : "delete"}
                    </span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="page-header flex-between" style={{ flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1>Categories</h1>
          <p>Organize your transactions with standardized Material symbols and colors</p>
        </div>
        <Link href="/categories/new" className="btn btn-primary" style={{ padding: "0.6rem 1.5rem", borderRadius: "0.75rem" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add</span>
          New Category
        </Link>
      </div>

      {isLoading && !data ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <div>
            <div className="skeleton" style={{ height: 32, width: 200, marginBottom: "1rem" }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: "1.25rem" }}>
              <div className="skeleton" style={{ height: 90, borderRadius: "1rem" }} />
              <div className="skeleton" style={{ height: 90, borderRadius: "1rem" }} />
              <div className="skeleton" style={{ height: 90, borderRadius: "1rem" }} />
            </div>
          </div>
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

      {/* ── Inline Material Icon Picker Modal ──────── */}
      {editingCategory && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem"
        }}
        onClick={() => setEditingCategory(null)}
        >
          <div className="card reveal" style={{
            width: "100%", maxWidth: 560, background: "var(--surface-container-lowest)",
            borderRadius: "1.5rem", padding: "2rem", boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
          }}
          onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div>
                <h3 className="text-headline-sm" style={{ fontWeight: 700 }}>Select Material Icon</h3>
                <p style={{ fontSize: 13, color: "var(--on-surface-variant)" }}>Updating icon for <strong>{editingCategory.name}</strong></p>
              </div>
              <button onClick={() => setEditingCategory(null)} className="btn btn-ghost btn-icon">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div style={{
              background: "var(--surface-variant, #e4e2e1)",
              padding: "1.25rem",
              borderRadius: "1rem",
              maxHeight: 340,
              overflowY: "auto",
              display: "grid",
              gridTemplateColumns: "repeat(8, 1fr)",
              gap: "0.5rem",
              border: "1px solid rgba(0,0,0,0.08)",
              marginBottom: "1.5rem"
            }}>
              {CURATED_MATERIAL_ICONS.map((ic) => {
                const isSelected = editingCategory.icon === ic || resolveMaterialIcon(editingCategory.icon || editingCategory.name) === ic;
                return (
                  <button
                    key={ic}
                    onClick={() => handleIconSelect(ic)}
                    disabled={updatingIcon}
                    style={{
                      width: 44, height: 44,
                      borderRadius: "0.5rem",
                      background: isSelected ? "var(--primary)" : "transparent",
                      color: isSelected ? "white" : "var(--on-surface)",
                      border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.15s",
                    }}
                    title={ic}
                    onMouseEnter={e => {
                      if (!isSelected) e.currentTarget.style.background = "rgba(0,0,0,0.08)";
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 24 }}>
                      {ic}
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
              <button onClick={() => setEditingCategory(null)} className="btn btn-secondary" style={{ padding: "0.6rem 1.5rem", borderRadius: "0.75rem" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
