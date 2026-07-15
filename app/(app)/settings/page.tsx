"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/utils/fetcher";

export default function SettingsPage() {
  const { data, mutate } = useSWR("/api/settings", fetcher);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const settings = data?.settings || {};

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage("");

    const formData = new FormData(e.currentTarget);
    const updateData = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      baseCurrency: formData.get("baseCurrency") as string,
      displayCurrency: formData.get("displayCurrency") as string,
      theme: formData.get("theme") as string,
      notifications: formData.get("notifications") === "on",
    };

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) throw new Error("Failed to save settings");
      
      await mutate();
      setMessage("Settings saved successfully!");
      setTimeout(() => setMessage(""), 3000); // clear message after 3 seconds
    } catch (err: any) {
      setMessage("Error: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!data) return <div style={{ padding: "2rem" }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 800 }}>
      <div className="page-header">
        <h1>Settings</h1>
        <p>Manage your account preferences and personal details</p>
      </div>

      <div className="card reveal">
        {message && (
          <div style={{ 
            padding: "1rem", 
            borderRadius: "var(--radius-sm)", 
            marginBottom: "1.5rem", 
            fontSize: 14, 
            background: message.includes("Error") ? "var(--error-container)" : "#1a1a1a", 
            color: message.includes("Error") ? "var(--error)" : "#fff",
            border: message.includes("Error") ? "none" : "1px solid #333",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              {message.includes("Error") ? "error" : "check_circle"}
            </span>
            {message}
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
          
          {/* Personal Details */}
          <section>
            <h2 className="text-headline-sm" style={{ marginBottom: "1.5rem" }}>Personal Details</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <div className="input-group">
                <label className="input-label" htmlFor="name">Full Name</label>
                <input id="name" name="name" type="text" className="input" defaultValue={settings.name} placeholder="John Doe" />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="email">Email Address</label>
                <input id="email" name="email" type="email" className="input" defaultValue={settings.email} placeholder="john@example.com" />
              </div>
            </div>
          </section>

          {/* Currency Settings */}
          <section>
            <h2 className="text-headline-sm" style={{ marginBottom: "1.5rem" }}>Currency & Region</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <div className="input-group">
                <label className="input-label" htmlFor="baseCurrency">Base Currency</label>
                <select id="baseCurrency" name="baseCurrency" className="input" defaultValue={settings.baseCurrency || "INR"}>
                  <option value="INR">₹ (Indian Rupee)</option>
                  <option value="USD">$ (US Dollar)</option>
                  <option value="EUR">€ (Euro)</option>
                  <option value="GBP">£ (British Pound)</option>
                </select>
                <p style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: "0.5rem" }}>
                  Your primary account currency.
                </p>
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="displayCurrency">Display Currency</label>
                <select id="displayCurrency" name="displayCurrency" className="input" defaultValue={settings.displayCurrency || "INR"}>
                  <option value="INR">₹ (Indian Rupee)</option>
                  <option value="USD">$ (US Dollar)</option>
                  <option value="EUR">€ (Euro)</option>
                  <option value="GBP">£ (British Pound)</option>
                </select>
                <p style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: "0.5rem" }}>
                  We will use live exchange rates to convert your dashboard totals to this currency.
                </p>
              </div>
            </div>
          </section>

          {/* App Preferences */}
          <section>
            <h2 className="text-headline-sm" style={{ marginBottom: "1.5rem" }}>App Preferences</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <div className="input-group">
                <label className="input-label" htmlFor="theme">App Theme</label>
                <select id="theme" name="theme" className="input" defaultValue={settings.theme || "dark"}>
                  <option value="light">Light Mode</option>
                  <option value="dark">Dark Mode</option>
                  <option value="system">System Default</option>
                </select>
              </div>
              
              <div className="input-group" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <label className="input-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                  <input type="checkbox" name="notifications" defaultChecked={settings.notifications !== false} style={{ width: 18, height: 18 }} />
                  Enable Push Notifications
                </label>
              </div>
            </div>
          </section>

          <div style={{ borderTop: "1px solid rgba(0,0,0,0.1)", paddingTop: "1.5rem" }}>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
