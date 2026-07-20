"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/utils/fetcher";

export default function ClaraWidget() {
  const { data } = useSWR("/api/settings", fetcher);
  const [isOpen, setIsOpen] = useState(false);

  const settings = data?.settings;
  const isEnabled = settings?.claraEnabled;
  const hasApiKey = !!settings?.claraApiKey && settings.claraApiKey.trim() !== "";

  // The assistant should only be visible if toggled on AND the API key is present
  if (!isEnabled || !hasApiKey) {
    return null;
  }

  return (
    <div style={{ position: "fixed", bottom: "2rem", right: "2rem", zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
      {isOpen && (
        <div className="card reveal" style={{ 
          width: 320, height: 400, marginBottom: "1rem", 
          display: "flex", flexDirection: "column", 
          boxShadow: "0 10px 40px rgba(0,0,0,0.2)", border: "1px solid var(--border)",
          overflow: "hidden"
        }}>
          <div style={{ padding: "1rem", borderBottom: "1px solid var(--border)", background: "var(--surface-variant)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span className="material-symbols-outlined" style={{ color: "var(--brand-purple)" }}>smart_toy</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: 14 }}>Clara AI Analyst</p>
              <p style={{ fontSize: 11, color: "var(--on-surface-variant)" }}>MCP Server Connected</p>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: "none", border: "none", color: "var(--on-surface-variant)", cursor: "pointer" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
            </button>
          </div>
          <div style={{ flex: 1, padding: "1rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ alignSelf: "flex-start", background: "var(--surface-variant)", padding: "0.75rem", borderRadius: "12px 12px 12px 0", maxWidth: "85%", fontSize: 13 }}>
              Hi! I'm Clara. I'm connected to your MCP server and can analyze your expenses, suggest budgets, and answer any questions. How can I assist you today?
            </div>
          </div>
          <div style={{ padding: "0.75rem", borderTop: "1px solid var(--border)", display: "flex", gap: "0.5rem" }}>
            <input 
              type="text" 
              placeholder="Ask Clara anything..." 
              className="input" 
              style={{ flex: 1, padding: "0.5rem 0.75rem", fontSize: 13, borderRadius: 20 }}
            />
            <button className="btn btn-primary btn-icon" style={{ borderRadius: "50%", width: 36, height: 36, padding: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>
            </button>
          </div>
        </div>
      )}
      
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: 56, height: 56, borderRadius: "50%", 
          background: "var(--brand-purple)", color: "white",
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 12px rgba(139, 92, 246, 0.4)",
          transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
          transform: isOpen ? "scale(0.9)" : "scale(1)"
        }}
        title="Chat with Clara AI"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 28 }}>
          {isOpen ? "close" : "smart_toy"}
        </span>
      </button>
    </div>
  );
}
