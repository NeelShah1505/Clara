"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { mutate } from "swr";

export default function NewCategoryPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [iconValue, setIconValue] = useState("category");
  const [showPicker, setShowPicker] = useState(false);

  const EMOJIS = [
    // Essentials & Finance
    "💰", "💳", "📈", "📉", "🏦", "💎", "🧾", "🪙", "💸",
    // Food & Drink
    "🍔", "🍕", "☕", "🍷", "🍹", "🥑", "🥐", "🍩", "🍎", "🥦", "🥩", "🍣", "🍱",
    // Shopping & Retail
    "🛒", "🛍️", "👗", "👞", "💄", "💍", "📱", "💻", "⌚", "🎁", "🧸", "📚",
    // Transport & Travel
    "🚗", "✈️", "🚌", "🚆", "🚲", "⛵", "🚀", "⛽", "🏨", "🏖️", "🗺️", "🏕️",
    // Home & Lifestyle
    "🏠", "🛋️", "🪴", "🧹", "🧻", "🚿", "🛁", "🔑", "🛠️", "🧰", "🧺", "🗑️",
    // Health & Wellness
    "🏥", "💊", "🩹", "🩺", "🏋️", "🧘", "🏃", "💆", "💈", "💅", "🦷", "🧠",
    // Entertainment & Leisure
    "🎮", "🎬", "🎫", "🎸", "🎧", "🎨", "⚽", "🎾", "🎳", "🎭", "📸", "🎢",
    // Work & Education
    "💼", "🎓", "🖋️", "📎", "📊", "📁", "🏫", "🔬", "📡", "🔋",
    // Misc
    "⚡", "💧", "🔥", "🐶", "🐱", "🐾", "🎉", "🎈", "🍼", "🎀", "🛡️", "🔮"
  ];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      type: formData.get("type") as string,
      icon: iconValue,
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

      // Invalidate the categories cache globally before routing
      await mutate("/api/categories");
      
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
              <label className="input-label">Category Icon</label>
              <input type="hidden" name="icon" value={iconValue} />
              
              <div style={{ 
                display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "0.25rem", 
                padding: "0.75rem", background: "var(--surface-variant)", 
                borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)",
                maxHeight: 200, overflowY: "auto"
              }}>
                {EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setIconValue(emoji)}
                    style={{
                      fontSize: "1.5rem",
                      padding: "0.5rem",
                      border: "none",
                      background: iconValue === emoji ? "var(--brand-blue)" : "transparent",
                      color: iconValue === emoji ? "#fff" : "inherit",
                      borderRadius: "0.5rem",
                      cursor: "pointer",
                      transition: "0.1s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
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
