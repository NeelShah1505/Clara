"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR, { mutate as globalMutate } from "swr";
import { fetcher } from "@/lib/utils/fetcher";

export default function SettingsPage() {
  const router = useRouter();
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
      monthlyBudgetReminder: formData.get("monthlyBudgetReminder") === "on",
      weeklyReport: formData.get("weeklyReport") === "on",
      dateFormat: formData.get("dateFormat") as string,
      defaultWalletView: formData.get("defaultWalletView") as string,
      claraEnabled: formData.get("claraEnabled") === "on",
      claraApiKey: formData.get("claraApiKey") as string,
      claraMcpUrl: formData.get("claraMcpUrl") as string,
      calendarSyncEnabled: formData.get("calendarSyncEnabled") === "on",
    };

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) throw new Error("Failed to save settings");
      
      await mutate();
      // Refresh all SWR caches to reflect currency change
      globalMutate(() => true, undefined, { revalidate: true });
      setMessage("Settings saved successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      setMessage("Error: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const testPushNotification = async () => {
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notification");
      return;
    }
    
    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }
    
    if (permission === "granted") {
      new Notification("Clara Finance", {
        body: "You have an upcoming bill due tomorrow!",
        icon: "/favicon.ico"
      });
      setMessage("Push notification fired successfully!");
    } else {
      alert("Please allow notifications in your browser settings to test this feature.");
    }
  };

  const testEmail = async () => {
    setMessage("Simulating email send... Check your inbox!");
    setTimeout(() => setMessage(""), 3000);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (e) {
      // Redirect anyway
      router.push("/login");
    }
  };

  if (!data) return <div style={{ padding: "2rem" }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 800 }}>

      {/* Toast */}
      {message && (
        <div style={{ 
          padding: "1rem", borderRadius: "var(--radius-sm)", marginBottom: "1.5rem", fontSize: 14, 
          background: message.includes("Error") ? "var(--error-container)" : "#1a1a1a", 
          color: message.includes("Error") ? "var(--error)" : "#fff",
          border: message.includes("Error") ? "none" : "1px solid #333",
          display: "flex", alignItems: "center", gap: "0.5rem"
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            {message.includes("Error") ? "error" : "check_circle"}
          </span>
          {message}
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        
        {/* ── Profile Section ──────────────────────────────────────────── */}
        <div className="card reveal">
          <h2 className="text-headline-sm" style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>person</span>
            Profile Information
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            <div className="input-group">
              <label className="input-label" htmlFor="name">Full Name</label>
              <input id="name" name="name" type="text" className="input" defaultValue={settings.name} placeholder="Your name" />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="email">Email Address</label>
              <input id="email" name="email" type="email" className="input" defaultValue={settings.email} placeholder="you@example.com" />
            </div>
          </div>
        </div>

        {/* ── Currency Section ──────────────────────────────────────────── */}
        <div className="card reveal" data-delay="100">
          <h2 className="text-headline-sm" style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>currency_exchange</span>
            Currency & Region
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            <div className="input-group">
              <label className="input-label" htmlFor="baseCurrency">Base Currency</label>
              <select id="baseCurrency" name="baseCurrency" className="input" defaultValue={settings.baseCurrency || "INR"}>
                <option value="INR">₹ Indian Rupee (INR)</option>
                <option value="USD">$ US Dollar (USD)</option>
                <option value="EUR">€ Euro (EUR)</option>
                <option value="GBP">£ British Pound (GBP)</option>
                <option value="JPY">¥ Japanese Yen (JPY)</option>
                <option value="AED">د.إ UAE Dirham (AED)</option>
                <option value="SGD">S$ Singapore Dollar (SGD)</option>
                <option value="AUD">A$ Australian Dollar (AUD)</option>
                <option value="CAD">C$ Canadian Dollar (CAD)</option>
              </select>
              <p style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: "0.5rem" }}>
                Your primary currency for inputting transactions.
              </p>
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="displayCurrency">Display Currency</label>
              <select id="displayCurrency" name="displayCurrency" className="input" defaultValue={settings.displayCurrency || "INR"}>
                <option value="INR">₹ Indian Rupee (INR)</option>
                <option value="USD">$ US Dollar (USD)</option>
                <option value="EUR">€ Euro (EUR)</option>
                <option value="GBP">£ British Pound (GBP)</option>
                <option value="JPY">¥ Japanese Yen (JPY)</option>
                <option value="AED">د.إ UAE Dirham (AED)</option>
                <option value="SGD">S$ Singapore Dollar (SGD)</option>
                <option value="AUD">A$ Australian Dollar (AUD)</option>
                <option value="CAD">C$ Canadian Dollar (CAD)</option>
              </select>
              <p style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: "0.5rem" }}>
                All amounts will be converted to this currency using live exchange rates.
              </p>
            </div>
          </div>
        </div>

        {/* AI & Integrations moved to /settings/integrations */}
        {/* ── Preferences Section ──────────────────────────────────────────── */}
        <div className="card reveal" data-delay="200">
          <h2 className="text-headline-sm" style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>tune</span>
            Preferences
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            <div className="input-group">
              <label className="input-label" htmlFor="theme">App Theme</label>
              <select id="theme" name="theme" className="input" defaultValue={settings.theme || "light"}>
                <option value="light">Light Mode</option>
                <option value="dark">Dark Mode</option>
                <option value="system">System Default</option>
              </select>
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="dateFormat">Date Format</label>
              <select id="dateFormat" name="dateFormat" className="input" defaultValue={settings.dateFormat || "dd/mm/yyyy"}>
                <option value="dd/mm/yyyy">DD/MM/YYYY</option>
                <option value="mm/dd/yyyy">MM/DD/YYYY</option>
                <option value="yyyy-mm-dd">YYYY-MM-DD</option>
              </select>
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="defaultWalletView">Default Wallet View</label>
              <select id="defaultWalletView" name="defaultWalletView" className="input" defaultValue={settings.defaultWalletView || "grid"}>
                <option value="grid">Grid View</option>
                <option value="list">List View</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Notifications Section ──────────────────────────────────────────── */}
        <div className="card reveal" data-delay="300">
          <h2 className="text-headline-sm" style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>notifications</span>
            Notifications
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <label style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", padding: "0.75rem", borderRadius: "var(--radius-sm)", border: "1px solid rgba(0,0,0,0.06)" }}>
                <input type="checkbox" name="notifications" defaultChecked={settings.notifications !== false} style={{ width: 18, height: 18, accentColor: "var(--brand-blue)" }} />
                <div>
                  <p style={{ fontWeight: 500, fontSize: 14 }}>Push Notifications</p>
                  <p style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>Get notified about upcoming bills and budget alerts</p>
                </div>
              </label>
              <button type="button" onClick={testPushNotification} className="btn btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: 12 }}>
                Test
              </button>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <label style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", padding: "0.75rem", borderRadius: "var(--radius-sm)", border: "1px solid rgba(0,0,0,0.06)" }}>
                <input type="checkbox" name="monthlyBudgetReminder" defaultChecked={settings.monthlyBudgetReminder !== false} style={{ width: 18, height: 18, accentColor: "var(--brand-blue)" }} />
                <div>
                  <p style={{ fontWeight: 500, fontSize: 14 }}>Monthly Budget Reminders</p>
                  <p style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>Remind me when I'm approaching budget limits</p>
                </div>
              </label>
              <button type="button" onClick={testEmail} className="btn btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: 12 }}>
                Test
              </button>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <label style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", padding: "0.75rem", borderRadius: "var(--radius-sm)", border: "1px solid rgba(0,0,0,0.06)" }}>
                <input type="checkbox" name="weeklyReport" defaultChecked={settings.weeklyReport === true} style={{ width: 18, height: 18, accentColor: "var(--brand-blue)" }} />
                <div>
                  <p style={{ fontWeight: 500, fontSize: 14 }}>Weekly Summary Email</p>
                  <p style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>Receive a weekly financial summary via email</p>
                </div>
              </label>
              <button type="button" onClick={testEmail} className="btn btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: 12 }}>
                Test
              </button>
            </div>
          </div>
        </div>

        {/* ── Save Button ──────────────────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" className="btn btn-primary" disabled={isSaving} style={{ minWidth: 160 }}>
            {isSaving ? "Saving..." : "Save All Changes"}
          </button>
        </div>
      </form>

      {/* ── Account Actions ──────────────────────────────────────────── */}
      <div className="card reveal" style={{ marginTop: "1.5rem", border: "1px solid rgba(239,68,68,0.2)" }}>
        <h2 className="text-headline-sm" style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--error)" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>warning</span>
          Account Actions
        </h2>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <button className="btn btn-secondary" onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span>
            Sign Out
          </button>
          <button className="btn" onClick={() => {
            if (confirm("Are you sure? This will export all your data as JSON.")) {
              fetch("/api/transactions").then(r => r.json()).then(data => {
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "clara-data-export.json";
                a.click();
              });
            }
          }} style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--surface-variant)", color: "var(--on-surface)" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
            Export My Data
          </button>
        </div>
        <p style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: "1rem" }}>
          Signing out will end your current session. You can sign back in anytime.
        </p>
      </div>
    </div>
  );
}
