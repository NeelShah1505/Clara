"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/utils/fetcher";

export default function NewBudgetPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { data, isLoading: categoriesLoading } = useSWR("/api/categories", fetcher);
  const categories = data?.categories || [];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const budgetData = {
      categoryId: formData.get("categoryId") as string,
      monthlyLimit: Number(formData.get("monthlyLimit")),
      month: formData.get("month") as string,
    };

    if (!budgetData.categoryId) {
      setError("Please select a category.");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(budgetData),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || "Failed to create budget");
      }

      router.push("/budgets");
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div className="page-header">
        <Link href="/budgets" className="btn btn-ghost btn-icon" style={{ marginBottom: "1rem", marginLeft: "-0.5rem" }}>
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <h1>Create Budget</h1>
        <p>Set a spending limit for a specific category.</p>
      </div>

      <div className="card reveal">
        {error && (
          <div style={{ background: "var(--error-container)", color: "var(--error)", padding: "1rem", borderRadius: "var(--radius-sm)", marginBottom: "1.5rem", fontSize: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          <div className="input-group">
            <label className="input-label" htmlFor="categoryId">Category</label>
            <select id="categoryId" name="categoryId" className="input" required disabled={categoriesLoading}>
              {categoriesLoading ? (
                <option value="">Loading categories...</option>
              ) : categories.length === 0 ? (
                <option value="">No categories available</option>
              ) : (
                categories.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))
              )}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            <div className="input-group">
              <label className="input-label" htmlFor="monthlyLimit">Monthly Limit (₹)</label>
              <input 
                id="monthlyLimit"
                name="monthlyLimit"
                type="number" 
                step="1"
                min="1"
                className="input" 
                placeholder="0.00"
                required
              />
            </div>
            
            <div className="input-group">
              <label className="input-label" htmlFor="month">Month</label>
              <input 
                id="month"
                name="month"
                type="month" 
                className="input" 
                required
                defaultValue={new Date().toISOString().slice(0, 7)}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
            <Link href="/budgets" className="btn btn-secondary">Cancel</Link>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting || categories.length === 0}>
              {isSubmitting ? "Saving..." : "Save Budget"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
