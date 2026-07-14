"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/utils/fetcher";

export default function NewTransactionPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Fetch wallets for the wallet selection dropdown
  const { data: walletData, isLoading: walletsLoading } = useSWR("/api/wallets", fetcher);
  const wallets = walletData?.wallets || [];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const data = {
      type: formData.get("type") as string,
      amount: Number(formData.get("amount")),
      currency: "INR",
      merchant: formData.get("merchant") as string,
      categoryId: formData.get("categoryId") as string,
      walletId: formData.get("walletId") as string,
      date: formData.get("date") as string,
    };

    if (!data.walletId) {
      setError("Please select a wallet. If you don't have one, create a wallet first.");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || "Failed to create transaction");
      }

      router.push("/transactions");
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div className="page-header">
        <Link href="/transactions" className="btn btn-ghost btn-icon" style={{ marginBottom: "1rem", marginLeft: "-0.5rem" }}>
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <h1>Add Transaction</h1>
        <p>Record a new income or expense.</p>
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
              <label className="input-label" htmlFor="type">Type</label>
              <select id="type" name="type" className="input" required defaultValue="expense">
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            
            <div className="input-group">
              <label className="input-label" htmlFor="amount">Amount (₹)</label>
              <input 
                id="amount"
                name="amount"
                type="number" 
                step="0.01"
                min="0.01"
                className="input" 
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="merchant">Merchant / Title</label>
            <input 
              id="merchant"
              name="merchant"
              type="text" 
              className="input" 
              placeholder="e.g. Starbucks, Salary, Amazon..."
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            <div className="input-group">
              <label className="input-label" htmlFor="categoryId">Category</label>
              <select id="categoryId" name="categoryId" className="input" required defaultValue="General">
                <option value="Housing">Housing</option>
                <option value="Food & Dining">Food & Dining</option>
                <option value="Transportation">Transportation</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Health">Health</option>
                <option value="Salary">Salary</option>
                <option value="General">General / Other</option>
              </select>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="walletId">Wallet</label>
              <select id="walletId" name="walletId" className="input" required disabled={walletsLoading}>
                {walletsLoading ? (
                  <option value="">Loading wallets...</option>
                ) : wallets.length === 0 ? (
                  <option value="">No wallets available</option>
                ) : (
                  wallets.map((w: any) => (
                    <option key={w.id} value={w.id}>{w.name} (₹{w.balance.toLocaleString()})</option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="date">Date</label>
            <input 
              id="date"
              name="date"
              type="date" 
              className="input" 
              required
              defaultValue={new Date().toISOString().split("T")[0]}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
            <Link href="/transactions" className="btn btn-secondary">Cancel</Link>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting || wallets.length === 0}>
              {isSubmitting ? "Saving..." : "Save Transaction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
