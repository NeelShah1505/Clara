import type { Metadata } from "next";

export const metadata: Metadata = { title: "Categories" };

const CATEGORIES = [
  { id: "1", name: "Housing",        type: "expense", icon: "home",            color: "var(--primary)" },
  { id: "2", name: "Food & Dining",  type: "expense", icon: "restaurant",      color: "var(--brand-pink)" },
  { id: "3", name: "Transportation", type: "expense", icon: "directions_car",  color: "var(--brand-blue)" },
  { id: "4", name: "Entertainment",  type: "expense", icon: "movie",           color: "var(--brand-yellow)" },
  { id: "5", name: "Health",         type: "expense", icon: "favorite",        color: "var(--brand-green)" },
  { id: "6", name: "Salary",         type: "income",  icon: "payments",        color: "var(--brand-green)" },
  { id: "7", name: "Investments",    type: "income",  icon: "trending_up",     color: "var(--brand-blue)" },
  { id: "8", name: "Miscellaneous",  type: "expense", icon: "category",        color: "var(--surface-variant)" },
];

export default function CategoriesPage() {
  const expenses = CATEGORIES.filter((c) => c.type === "expense");
  const income = CATEGORIES.filter((c) => c.type === "income");

  const renderCategoryGrid = (items: typeof CATEGORIES) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
      {items.map((c) => (
        <div key={c.id} className="card" style={{ padding: "1rem", display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
          <div style={{ width: 36, height: 36, borderRadius: "var(--radius-sm)", background: c.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: c.color === "var(--primary)" || c.color === "var(--surface-variant)" ? "#fff" : "var(--primary)" }}>{c.icon}</span>
          </div>
          <span style={{ fontWeight: 500, fontSize: 14 }}>{c.name}</span>
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
        <button className="btn btn-primary">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          New Category
        </button>
      </div>

      <div className="reveal">
        <h2 className="text-headline-sm" style={{ marginBottom: "1rem" }}>Expense Categories</h2>
        {renderCategoryGrid(expenses)}
      </div>

      <div className="reveal" style={{ marginTop: "2rem" }}>
        <h2 className="text-headline-sm" style={{ marginBottom: "1rem" }}>Income Categories</h2>
        {renderCategoryGrid(income)}
      </div>
    </div>
  );
}
