"use client";

import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/utils/fetcher";

export default function CategoriesPage() {
  const { data, error, isLoading } = useSWR("/api/categories", fetcher);
  
  const categories = data?.categories || [];

  const renderCategoryGrid = (items: any[]) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
      {items.map((c) => (
        <div key={c.id} className="card reveal" style={{ padding: "1rem", display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
          <div style={{ width: 36, height: 36, borderRadius: "var(--radius-sm)", background: c.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#fff" }}>{c.icon}</span>
          </div>
          <span style={{ fontWeight: 500, fontSize: 14 }}>{c.name}</span>
          {c.isDefault && <span style={{ marginLeft: "auto", fontSize: 10, background: "var(--surface-variant)", padding: "2px 6px", borderRadius: 4 }}>Default</span>}
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <div className="page-header flex-between" style={{ flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1>Categories</h1>
          <p>Manage how your transactions are classified</p>
        </div>
        <Link href="/categories/new" className="btn btn-primary">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          New Category
        </Link>
      </div>

      <div className="reveal">
        {isLoading ? (
           <div style={{ padding: "3rem 0", textAlign: "center" }}>
             <div className="spinner" style={{ margin: "0 auto 1rem" }} />
             <p style={{ color: "var(--on-surface-variant)", fontSize: 14 }}>Loading categories...</p>
           </div>
        ) : categories.length === 0 ? (
           <div style={{ padding: "3rem 0", textAlign: "center" }}>
             <span className="material-symbols-outlined" style={{ fontSize: 32, color: "var(--outline-variant)", marginBottom: "0.5rem" }}>category</span>
             <p style={{ color: "var(--on-surface-variant)", fontSize: 14 }}>No categories found.</p>
           </div>
        ) : (
          renderCategoryGrid(categories)
        )}
      </div>
    </div>
  );
}
