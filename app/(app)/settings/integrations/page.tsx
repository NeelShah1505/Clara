"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function IntegrationsSettingsPage() {
  const { data, error: loadError, mutate } = useSWR("/api/settings", fetcher);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const settings = data?.settings || {};

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    const formData = new FormData(e.currentTarget);
    const updateData = {
      claraEnabled: formData.get("claraEnabled") === "on",
      claraApiKey: formData.get("claraApiKey") as string,
      claraMcpUrl: formData.get("claraMcpUrl") as string,
      calendarSyncEnabled: formData.get("calendarSyncEnabled") === "on",
      webhookUrl: formData.get("webhookUrl") as string,
    };

    if (updateData.claraEnabled && !updateData.claraApiKey.trim()) {
      alert("Please generate an API key to enable the Clara AI assistant.");
      document.getElementById("claraApiKey")?.focus();
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) throw new Error("Failed to update integrations.");
      setMessage("Integrations updated successfully!");
      mutate({ settings: { ...settings, ...updateData } }, false);
    } catch (err: any) {
      setMessage(err.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  if (loadError) return <div style={{ color: "var(--error)" }}>Failed to load integrations.</div>;
  if (!data) return <div className="skeleton" style={{ height: 400, borderRadius: "var(--radius-md)" }} />;

  return (
    <div>
      {/* Toast */}
      {message && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: message.includes("success") ? "var(--success-container)" : "var(--error-container)",
          color: message.includes("success") ? "var(--success)" : "var(--error)",
          padding: "1rem 2rem", borderRadius: "var(--radius-full)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 100, fontWeight: 500
        }}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        
        {/* ── Clara AI Section ──────────────────────────────────────────── */}
        <div className="card reveal">
          <h2 className="text-headline-sm" style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: "var(--brand-purple)" }}>smart_toy</span>
            Clara AI Assistant
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", padding: "0.75rem", borderRadius: "var(--radius-sm)", border: "1px solid rgba(0,0,0,0.06)" }}>
              <input type="checkbox" name="claraEnabled" defaultChecked={settings.claraEnabled === true} style={{ width: 18, height: 18, accentColor: "var(--brand-purple)" }} />
              <div>
                <p style={{ fontWeight: 500, fontSize: 14 }}>Enable Clara Assistant</p>
                <p style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>Floating AI analyst to provide insights and answer questions on all pages.</p>
              </div>
            </label>
          </div>
        </div>

        {/* ── MCP Server Section ──────────────────────────────────────────── */}
        <div className="card reveal" data-delay="100">
          <h2 className="text-headline-sm" style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: "var(--brand-blue)" }}>terminal</span>
            MCP Integration
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <p style={{ fontSize: 14, color: "var(--on-surface-variant)" }}>
              Connect Clara to your IDE (Cursor, Windsurf) using the Model Context Protocol.
            </p>
            <div className="input-group">
              <label className="input-label" htmlFor="claraApiKey">Clara API Key</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input 
                  id="claraApiKey" name="claraApiKey" type="text" className="input" readOnly 
                  defaultValue={settings.claraApiKey || ""} placeholder="Click Generate to create a key" 
                  style={{ flex: 1, fontFamily: "monospace", color: "var(--brand-purple)" }}
                />
                <button type="button" className="btn btn-secondary" onClick={() => {
                  const newKey = "clara_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                  (document.getElementById("claraApiKey") as HTMLInputElement).value = newKey;
                }}>Generate</button>
              </div>
              <p style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: "0.5rem" }}>
                Copy this key into your IDE's `CLARA_API_KEY` environment variable.
              </p>
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="claraMcpUrl">MCP Server URL (Local Override)</label>
              <input id="claraMcpUrl" name="claraMcpUrl" type="url" className="input" defaultValue={settings.claraMcpUrl || ""} placeholder="http://localhost:3000/api (Optional)" />
              <p style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: "0.5rem" }}>
                Set to your production URL when deployed, or localhost for local testing.
              </p>
            </div>
          </div>
        </div>

        {/* ── Google Calendar Section ──────────────────────────────────────── */}
        <div className="card reveal" data-delay="200">
          <h2 className="text-headline-sm" style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>calendar_month</span>
            Google Calendar
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ padding: "1rem", background: "rgba(0,0,0,0.02)", borderRadius: "var(--radius-md)", fontSize: 13, color: "var(--on-surface-variant)" }}>
              <strong>Setup Guide:</strong><br />
              1. Create a project in the Google Cloud Console.<br />
              2. Enable the Google Calendar API.<br />
              3. Generate an OAuth 2.0 Client ID and add it to your server environment variables.<br />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", padding: "0.75rem", borderRadius: "var(--radius-sm)", border: "1px solid rgba(0,0,0,0.06)" }}>
              <input type="checkbox" name="calendarSyncEnabled" defaultChecked={settings.calendarSyncEnabled === true} style={{ width: 18, height: 18, accentColor: "var(--brand-purple)" }} />
              <div>
                <p style={{ fontWeight: 500, fontSize: 14 }}>Enable Calendar Sync</p>
                <p style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>Sync subscriptions to your calendar with a 1-day reminder.</p>
              </div>
            </label>
          </div>
        </div>

        {/* ── Data Sync / Webhooks ──────────────────────────────────────────── */}
        <div className="card reveal" data-delay="300">
          <h2 className="text-headline-sm" style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>webhook</span>
            Data Sync
          </h2>
          <div className="input-group">
            <label className="input-label" htmlFor="webhookUrl">Webhook URL</label>
            <input id="webhookUrl" name="webhookUrl" type="url" className="input" defaultValue={settings.webhookUrl || ""} placeholder="https://your-server.com/webhook" />
            <p style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: "0.5rem" }}>
              Receive HTTP POST events when transactions are created or updated.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Integrations"}
          </button>
        </div>
      </form>
    </div>
  );
}
