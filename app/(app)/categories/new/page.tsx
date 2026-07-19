"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewCategoryPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      type: formData.get("type") as string,
      icon: formData.get("icon") as string,
      color: formData.get("color") as string,
    };

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || "Failed to create category");
      }

      router.push("/categories");
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div className="page-header">
        <Link href="/categories" className="btn btn-ghost btn-icon" style={{ marginBottom: "1rem", marginLeft: "-0.5rem" }}>
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <h1>Add New Category</h1>
        <p>Create a custom category for your transactions.</p>
      </div>

      <div className="card reveal">
        {error && (
          <div style={{ background: "var(--error-container)", color: "var(--error)", padding: "1rem", borderRadius: "var(--radius-sm)", marginBottom: "1.5rem", fontSize: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            <div className="input-group">
              <label className="input-label" htmlFor="name">Category Name</label>
              <input 
                id="name" name="name" type="text" className="input" 
                placeholder="e.g. Subscriptions, Gifts..." required
              />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="type">Type</label>
              <select id="type" name="type" className="input" required defaultValue="expense">
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
          </div>          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            <div className="input-group">
              <label className="input-label" htmlFor="icon">Material Icon Name</label>
              <input 
                id="icon"
                name="icon"
                type="text" 
                className="input" 
                placeholder="e.g. stars, pet_supplies..."
                defaultValue="category"
                required
              />
              <p style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: "0.5rem" }}>
                Find names at <a href="https://fonts.google.com/icons" target="_blank" rel="noreferrer" style={{color: "var(--brand-blue)"}}>Google Fonts</a>.
              </p>
            </div>
            
            <div className="input-group">
              <label className="input-label" htmlFor="color">Color</label>
              <input 
                id="color"
                name="color"
                type="color" 
                className="input" 
                defaultValue="#3b82f6"
                style={{ height: 44, padding: "0 0.5rem", cursor: "pointer" }}
                required
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
            <Link href="/categories" className="btn btn-secondary">Cancel</Link>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
