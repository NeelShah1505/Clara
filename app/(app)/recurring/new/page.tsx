"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/utils/fetcher";

export default function NewRecurringRulePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [txType, setTxType] = useState("expense");

  const { data: walletsData } = useSWR("/api/wallets", fetcher);
  const { data: categoriesData } = useSWR("/api/categories", fetcher);
  const { data: settingsData } = useSWR("/api/settings", fetcher);

  const wallets = walletsData?.wallets || [];
  const allCategories = categoriesData?.categories || [];
  
  // Filter categories by selected transaction type
  const categories = allCategories.filter((c: any) => c.type === txType);
  const defaultCurrency = settingsData?.settings?.baseCurrency || "INR";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    
    // The backend expects: { frequency, nextRunDate, templateTransaction: { type, amount, currency, walletId, categoryId, merchant, notes } }
    const walletId = formData.get("walletId") as string;
    const wallet = wallets.find((w: any) => w.id === walletId);

    const payload = {
      frequency: formData.get("frequency") as string,
      nextRunDate: formData.get("startDate") as string,
      templateTransaction: {
        type: txType,
        amount: Number(formData.get("amount")),
        currency: wallet ? wallet.currency : defaultCurrency,
        walletId: walletId,
        categoryId: formData.get("categoryId") as string,
        merchant: formData.get("description") as string, // we map description to merchant
        notes: "",
        paymentMethod: "other"
      }
    };

    try {
      const res = await fetch("/api/recurring-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || "Failed to create rule");
      }

      router.push("/recurring");
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div className="page-header">
        <Link href="/recurring" className="btn btn-ghost btn-icon" style={{ marginBottom: "1rem", marginLeft: "-0.5rem" }}>
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <h1>New Automated Rule</h1>
        <p>Set up a recurring transaction.</p>
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
              <label className="input-label" htmlFor="type">Transaction Type</label>
              <select 
                id="type" 
                name="type" 
                className="input" 
                required 
                value={txType}
                onChange={(e) => setTxType(e.target.value)}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            
            <div className="input-group">
              <label className="input-label" htmlFor="amount">Amount</label>
              <input id="amount" name="amount" type="number" step="0.01" className="input" required placeholder="0.00" />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="description">Description / Merchant</label>
            <input id="description" name="description" type="text" className="input" required placeholder="e.g. Monthly Rent, Netflix..." />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            <div className="input-group">
              <label className="input-label" htmlFor="categoryId">Category</label>
              <select id="categoryId" name="categoryId" className="input" required>
                {categories.length === 0 ? (
                  <option value="" disabled>No categories found</option>
                ) : (
                  categories.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))
                )}
              </select>
            </div>
            
            <div className="input-group">
              <label className="input-label" htmlFor="walletId">Wallet</label>
              <select id="walletId" name="walletId" className="input" required>
                {wallets.map((w: any) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            <div className="input-group">
              <label className="input-label" htmlFor="frequency">Frequency</label>
              <select id="frequency" name="frequency" className="input" required defaultValue="monthly">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            
            <div className="input-group">
              <label className="input-label" htmlFor="startDate">Start Date</label>
              <input 
                id="startDate" 
                name="startDate" 
                type="date" 
                className="input" 
                required 
                defaultValue={todayStr} 
                min={todayStr} 
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
            <Link href="/recurring" className="btn btn-secondary">Cancel</Link>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Rule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
