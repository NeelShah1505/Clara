"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/utils/fetcher";
import { useCurrency } from "@/components/CurrencyProvider";

export default function NewTransactionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [txType, setTxType] = useState(searchParams.get("type") || "expense");
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  // Track selected category explicitly so custom-created ones auto-select
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  const { data: walletData, isLoading: walletsLoading } = useSWR("/api/wallets", fetcher);
  const { data: catData, isLoading: catsLoading, mutate: mutateCats } = useSWR("/api/categories", fetcher);
  const { baseCurrency, displayCurrency } = useCurrency();
  const symbol = displayCurrency === "INR" ? "₹" : displayCurrency === "EUR" ? "€" : displayCurrency === "GBP" ? "£" : displayCurrency;

  const wallets = walletData?.wallets || [];
  const allCategories = catData?.categories || [];
  const categories = allCategories.filter((c: any) => c.type === txType);

  // When txType changes, reset selected category to first of new type
  useEffect(() => {
    setSelectedCategoryId("");
  }, [txType]);

  // Auto-select first category when list loads
  useEffect(() => {
    if (!selectedCategoryId && categories.length > 0) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  const prefilledDate = searchParams.get("date") || new Date().toISOString().split("T")[0];

  const handleCreateCustomCategory = async () => {
    if (!customCategoryName.trim()) return;
    setCreatingCategory(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customCategoryName.trim(),
          type: txType,
          icon: txType === "income" ? "add_circle" : "category",
          color: "#64748b",
        }),
      });
      if (res.ok) {
        const result = await res.json();
        // Auto-select the newly created category
        await mutateCats();
        setSelectedCategoryId(result.category.id);
        setShowCustomCategory(false);
        setCustomCategoryName("");
      }
    } catch (e) {
      console.error(e);
    }
    setCreatingCategory(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const walletId = formData.get("walletId") as string;
    const wallet = wallets.find((w: any) => w.id === walletId);

    // Use the controlled selectedCategoryId state, not formData (since select is controlled)
    if (!selectedCategoryId) {
      setError("Please select a category.");
      setIsSubmitting(false);
      return;
    }

    const data = {
      type: txType,
      amount: Number(formData.get("amount")),
      currency: wallet?.currency || baseCurrency,
      merchant: formData.get("merchant") as string,
      categoryId: selectedCategoryId,
      walletId: walletId,
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
              <select 
                id="type" name="type" className="input" required 
                value={txType}
                onChange={(e) => setTxType(e.target.value)}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            
            <div className="input-group">
              <label className="input-label" htmlFor="amount">Amount ({symbol})</label>
              <input 
                id="amount" name="amount" type="number" step="0.01" min="0.01"
                className="input" placeholder="0.00" required
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="merchant">Merchant / Title</label>
            <input 
              id="merchant" name="merchant" type="text" className="input" 
              placeholder="e.g. Starbucks, Salary, Amazon..." required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            <div className="input-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                <label className="input-label" htmlFor="categoryId" style={{ marginBottom: 0 }}>Category</label>
                <button type="button" onClick={() => setShowCustomCategory(!showCustomCategory)} style={{ fontSize: 11, color: "var(--brand-blue)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                  {showCustomCategory ? "← Back" : "+ Custom"}
                </button>
              </div>
              {showCustomCategory ? (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input 
                    type="text" className="input" placeholder="Category name..."
                    value={customCategoryName}
                    onChange={(e) => setCustomCategoryName(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button 
                    type="button" className="btn btn-primary btn-sm"
                    onClick={handleCreateCustomCategory}
                    disabled={creatingCategory || !customCategoryName.trim()}
                  >
                    {creatingCategory ? "..." : "Add"}
                  </button>
                </div>
              ) : (
                <select 
                  id="categoryId" className="input" required 
                  disabled={catsLoading}
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                >
                  {catsLoading ? (
                    <option value="">Loading...</option>
                  ) : categories.length === 0 ? (
                    <option value="">No {txType} categories</option>
                  ) : (
                    <>
                      <option value="">Select a category</option>
                      {categories.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </>
                  )}
                </select>
              )}
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
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="date">Date</label>
            <input 
              id="date" name="date" type="date" className="input" required
              defaultValue={prefilledDate}
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
