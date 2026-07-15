"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewGoalPage() {
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
      targetAmount: Number(formData.get("targetAmount")),
      targetDate: formData.get("targetDate") as string,
      color: formData.get("color") as string,
    };

    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || "Failed to create goal");
      }

      router.push("/goals");
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div className="page-header">
        <Link href="/goals" className="btn btn-ghost btn-icon" style={{ marginBottom: "1rem", marginLeft: "-0.5rem" }}>
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <h1>Create a Goal</h1>
        <p>Set a new financial target.</p>
      </div>

      <div className="card reveal">
        {error && (
          <div style={{ background: "var(--error-container)", color: "var(--error)", padding: "1rem", borderRadius: "var(--radius-sm)", marginBottom: "1.5rem", fontSize: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="input-group">
            <label className="input-label" htmlFor="name">Goal Name</label>
            <input 
              id="name"
              name="name"
              type="text" 
              className="input" 
              placeholder="e.g. Vacation Fund, New Laptop..."
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            <div className="input-group">
              <label className="input-label" htmlFor="targetAmount">Target Amount</label>
              <input id="targetAmount" name="targetAmount" type="number" step="0.01" className="input" required placeholder="0.00" />
            </div>
            
            <div className="input-group">
              <label className="input-label" htmlFor="targetDate">Target Date (Optional)</label>
              <input id="targetDate" name="targetDate" type="date" className="input" min={new Date().toISOString().split("T")[0]} />
            </div>
          </div>

          <div className="input-group" style={{ maxWidth: 200 }}>
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

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
            <Link href="/goals" className="btn btn-secondary">Cancel</Link>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Goal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
