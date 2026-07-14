import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin Settings" };

export default function AdminSettingsPage() {
  return (
    <div>
      <div className="page-header">
        <h1>Site Settings</h1>
        <p>Global platform configurations and feature flags</p>
      </div>

      <div className="content-grid-2-1">
        <div className="card reveal">
          <h2 className="text-headline-sm" style={{ marginBottom: "1.5rem" }}>Feature Flags</h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="flex-between" style={{ paddingBottom: "1rem", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
              <div>
                <p style={{ fontWeight: 600 }}>Enable Signups</p>
                <p style={{ fontSize: 13, color: "var(--on-surface-variant)" }}>Allow new users to register on the platform</p>
              </div>
              <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                <input type="checkbox" defaultChecked style={{ width: 24, height: 24, accentColor: "var(--brand-green)" }} />
              </label>
            </div>
            
            <div className="flex-between" style={{ paddingBottom: "1rem", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
              <div>
                <p style={{ fontWeight: 600 }}>Maintenance Mode</p>
                <p style={{ fontSize: 13, color: "var(--on-surface-variant)" }}>Display maintenance screen to all non-admin users</p>
              </div>
              <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                <input type="checkbox" style={{ width: 24, height: 24, accentColor: "var(--brand-green)" }} />
              </label>
            </div>

            <div className="flex-between" style={{ paddingBottom: "1rem", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
              <div>
                <p style={{ fontWeight: 600 }}>Plaid Integration</p>
                <p style={{ fontSize: 13, color: "var(--on-surface-variant)" }}>Enable automatic bank syncing via Plaid API</p>
              </div>
              <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                <input type="checkbox" defaultChecked style={{ width: 24, height: 24, accentColor: "var(--brand-green)" }} />
              </label>
            </div>

            <div className="flex-between">
              <div>
                <p style={{ fontWeight: 600 }}>AI Insights</p>
                <p style={{ fontSize: 13, color: "var(--on-surface-variant)" }}>Enable AI-driven categorical insights on Dashboard</p>
              </div>
              <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                <input type="checkbox" defaultChecked style={{ width: 24, height: 24, accentColor: "var(--brand-green)" }} />
              </label>
            </div>
          </div>
        </div>

        <div className="card reveal" data-delay="100">
          <h2 className="text-headline-sm" style={{ marginBottom: "1.5rem" }}>System Config</h2>
          
          <div className="input-group">
            <label className="input-label">Max Rate Limit (Req/Min)</label>
            <input className="input" type="number" defaultValue="100" />
          </div>

          <div className="input-group">
            <label className="input-label">Max Users Cap</label>
            <input className="input" type="number" defaultValue="10000" />
            <p style={{ fontSize: 11, color: "var(--on-surface-variant)", marginTop: 4 }}>Set to 0 for unlimited</p>
          </div>

          <button className="btn btn-primary" style={{ width: "100%", marginTop: "1rem" }}>Save Configuration</button>
        </div>
      </div>
    </div>
  );
}
