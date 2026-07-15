"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/utils/fetcher";

export default function NewSubscriptionPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [billingCycle, setBillingCycle] = useState("monthly");

  const { data: walletData, isLoading: walletsLoading } = useSWR("/api/wallets", fetcher);
  const { data: catData, isLoading: catLoading } = useSWR("/api/categories", fetcher);
  const { data: settingsData } = useSWR("/api/settings", fetcher);

  const wallets = walletData?.wallets || [];
  const allCategories = catData?.categories || [];
  // Typically subscriptions are expenses, so filter categories to expense
  const categories = allCategories.filter((c: any) => c.type === "expense");
  const defaultCurrency = settingsData?.settings?.baseCurrency || "INR";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const data: any = {
      name: formData.get("name") as string,
      amount: Number(formData.get("amount")),
      currency: formData.get("currency") as string,
      billingCycle: billingCycle,
      nextDueDate: formData.get("nextDueDate") as string,
      categoryId: formData.get("categoryId") as string,
      walletId: formData.get("walletId") as string,
      notes: formData.get("notes") as string,
    };

    if (billingCycle === "custom") {
      data.customDays = Number(formData.get("customDays"));
      if (!data.customDays || data.customDays <= 0) {
        setError("Please enter a valid number of days for the custom cycle.");
        setIsSubmitting(false);
        return;
      }
    }

    if (!data.walletId || !data.categoryId) {
      setError("Please select both a wallet and a category.");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || "Failed to create subscription");
      }

      router.push("/subscriptions");
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div className="page-header">
        <Link href="/subscriptions" className="btn btn-ghost btn-icon" style={{ marginBottom: "1rem", marginLeft: "-0.5rem" }}>
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <h1>Add Subscription</h1>
        <p>Track a new recurring service or bill.</p>
      </div>

      <div className="card reveal">
        {error && (
          <div style={{ background: "var(--error-container)", color: "var(--error)", padding: "1rem", borderRadius: "var(--radius-sm)", marginBottom: "1.5rem", fontSize: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          <div className="input-group">
            <label className="input-label" htmlFor="name">Service Name</label>
            <input 
              id="name"
              name="name"
              type="text" 
              className="input" 
              placeholder="e.g. Netflix, Spotify, Gym..."
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            <div className="input-group">
              <label className="input-label" htmlFor="amount">Cost</label>
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
            
            <div className="input-group">
              <label className="input-label" htmlFor="currency">Currency</label>
              <select id="currency" name="currency" className="input" required defaultValue={defaultCurrency}>
                <option value="INR">₹ (INR)</option>
                <option value="USD">$ (USD)</option>
                <option value="EUR">€ (EUR)</option>
                <option value="GBP">£ (GBP)</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: billingCycle === "custom" ? "1fr 1fr 1fr" : "1fr 1fr", gap: "1.5rem" }}>
            <div className="input-group">
              <label className="input-label" htmlFor="billingCycle">Billing Cycle</label>
              <select 
                id="billingCycle" 
                name="billingCycle" 
                className="input" 
                required 
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value)}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
                <option value="custom">Custom (Days)</option>
              </select>
            </div>

            {billingCycle === "custom" && (
              <div className="input-group">
                <label className="input-label" htmlFor="customDays">Every X Days</label>
                <input 
                  id="customDays"
                  name="customDays"
                  type="number" 
                  className="input" 
                  min="1"
                  required
                />
              </div>
            )}

            <div className="input-group">
              <label className="input-label" htmlFor="nextDueDate">Next Due Date</label>
              <input 
                id="nextDueDate"
                name="nextDueDate"
                type="date" 
                className="input" 
                min={todayStr}
                required
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            <div className="input-group">
              <div className="flex-between" style={{ marginBottom: "0.25rem" }}>
                <label className="input-label" htmlFor="categoryId" style={{ marginBottom: 0 }}>Category</label>
                <Link href="/categories" style={{ fontSize: 12, color: "var(--brand-blue)" }}>Manage Categories</Link>
              </div>
              <select id="categoryId" name="categoryId" className="input" required disabled={catLoading}>
                {catLoading ? (
                  <option value="">Loading categories...</option>
                ) : categories.length === 0 ? (
                  <option value="">No expense categories</option>
                ) : (
                  categories.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))
                )}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="walletId">Payment Method (Wallet)</label>
              <select id="walletId" name="walletId" className="input" required disabled={walletsLoading}>
                {walletsLoading ? (
                  <option value="">Loading wallets...</option>
                ) : wallets.length === 0 ? (
                  <option value="">No wallets available</option>
                ) : (
                  wallets.map((w: any) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))
                )}
              </select>
            </div>
          </div>
          
          <div className="input-group">
            <label className="input-label" htmlFor="notes">Notes (Optional)</label>
            <input 
              id="notes"
              name="notes"
              type="text" 
              className="input" 
              placeholder="e.g. Family plan, yearly discount"
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
            <Link href="/subscriptions" className="btn btn-secondary">Cancel</Link>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting || categories.length === 0 || wallets.length === 0}>
              {isSubmitting ? "Saving..." : "Save Subscription"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
