"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/utils/fetcher";

const PRESET_TYPES = [
  { value: "bank", label: "Bank Account" },
  { value: "cash", label: "Cash Wallet" },
  { value: "credit_card", label: "Credit Card" },
  { value: "debit_card", label: "Debit Card" },
  { value: "upi", label: "UPI / Mobile" },
  { value: "paypal", label: "PayPal" },
  { value: "crypto", label: "Crypto" },
  { value: "savings", label: "Savings Account" },
  { value: "custom", label: "Other (Custom)" },
];

export default function NewWalletPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedType, setSelectedType] = useState("bank");
  const [customType, setCustomType] = useState("");

  const { data: settingsData } = useSWR("/api/settings", fetcher);
  const defaultCurrency = settingsData?.settings?.baseCurrency || "INR";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const walletType = selectedType === "custom" ? customType : selectedType;

    if (!walletType.trim()) {
      setError("Please enter a wallet type.");
      setIsSubmitting(false);
      return;
    }

    const data = {
      name: formData.get("name") as string,
      type: walletType,
      currency: formData.get("currency") as string,
      openingBalance: Number(formData.get("openingBalance")) || 0,
    };

    try {
      const res = await fetch("/api/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || "Failed to create wallet");
      }

      router.push("/wallets");
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div className="page-header">
        <Link href="/wallets" className="btn btn-ghost btn-icon" style={{ marginBottom: "1rem", marginLeft: "-0.5rem" }}>
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <h1>Add New Wallet</h1>
        <p>Create a new account to track your balance.</p>
      </div>

      <div className="card reveal">
        {error && (
          <div style={{ background: "var(--error-container)", color: "var(--error)", padding: "1rem", borderRadius: "var(--radius-sm)", marginBottom: "1.5rem", fontSize: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          <div className="input-group">
            <label className="input-label" htmlFor="name">Account Name</label>
            <input 
              id="name" name="name" type="text" className="input" 
              placeholder="e.g. Main Checking, Chase Sapphire..." required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            <div className="input-group">
              <label className="input-label" htmlFor="type">Account Type</label>
              <select 
                id="type" className="input" required 
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                {PRESET_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              {selectedType === "custom" && (
                <input 
                  type="text" className="input" placeholder="Enter custom type..."
                  value={customType} onChange={(e) => setCustomType(e.target.value)}
                  required style={{ marginTop: "0.5rem" }}
                />
              )}
            </div>
            
            <div className="input-group">
              <label className="input-label" htmlFor="currency">Currency</label>
              <select id="currency" name="currency" className="input" required defaultValue={defaultCurrency}>
                <option value="INR">₹ (INR)</option>
                <option value="USD">$ (USD)</option>
                <option value="EUR">€ (EUR)</option>
                <option value="GBP">£ (GBP)</option>
                <option value="JPY">¥ (JPY)</option>
                <option value="AED">د.إ (AED)</option>
                <option value="SGD">S$ (SGD)</option>
                <option value="AUD">A$ (AUD)</option>
                <option value="CAD">C$ (CAD)</option>
              </select>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="openingBalance">Opening Balance</label>
            <input 
              id="openingBalance" name="openingBalance" type="number" step="0.01"
              className="input" placeholder="0.00"
            />
            <p style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: "0.5rem" }}>
              Leave blank if 0. Negative balances are allowed for credit cards.
            </p>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
            <Link href="/wallets" className="btn btn-secondary">Cancel</Link>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Wallet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
