import type { Metadata } from "next";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div>
      <div className="page-header">
        <h1>Settings</h1>
        <p>Manage your account, preferences, and security</p>
      </div>

      <div className="content-grid-2-1">
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--stack-md)" }}>
          {/* Profile */}
          <div className="card reveal">
            <h2 className="text-headline-sm" style={{ marginBottom: "1.5rem" }}>Profile Information</h2>
            <div style={{ display: "flex", gap: "1.5rem", marginBottom: "2rem", alignItems: "center" }}>
              <div style={{ width: 80, height: 80, borderRadius: "var(--radius-full)", background: "var(--brand-pink)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, color: "var(--primary)" }}>
                N
              </div>
              <button className="btn btn-secondary btn-sm">Change Avatar</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="input-group">
                <label className="input-label">First Name</label>
                <input className="input" defaultValue="Neel" />
              </div>
              <div className="input-group">
                <label className="input-label">Last Name</label>
                <input className="input" defaultValue="Shah" />
              </div>
              <div className="input-group" style={{ gridColumn: "1 / -1" }}>
                <label className="input-label">Email Address</label>
                <input className="input" defaultValue="neel@example.com" disabled />
              </div>
            </div>
            <button className="btn btn-primary" style={{ marginTop: "1rem" }}>Save Changes</button>
          </div>

          {/* Preferences */}
          <div className="card reveal" data-delay="100">
            <h2 className="text-headline-sm" style={{ marginBottom: "1.5rem" }}>Preferences</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div className="flex-between">
                <div>
                  <p style={{ fontWeight: 500 }}>Base Currency</p>
                  <p style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>The currency used for all reports and displays</p>
                </div>
                <select className="input" style={{ width: 120 }}>
                  <option>INR (₹)</option>
                  <option>USD ($)</option>
                  <option>EUR (€)</option>
                </select>
              </div>
              <div className="divider" />
              <div className="flex-between">
                <div>
                  <p style={{ fontWeight: 500 }}>Weekly Digest Email</p>
                  <p style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>Receive a summary of your spending every Sunday</p>
                </div>
                <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                  <input type="checkbox" defaultChecked style={{ width: 20, height: 20, accentColor: "var(--primary)" }} />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Danger zone */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--stack-md)" }}>
          <div className="card reveal" data-delay="200">
            <h2 className="text-headline-sm" style={{ marginBottom: "1.5rem" }}>Security</h2>
            <button className="btn btn-secondary" style={{ width: "100%", marginBottom: "1rem" }}>Change Password</button>
            <button className="btn btn-secondary" style={{ width: "100%" }}>Enable Two-Factor Auth</button>
          </div>

          <div className="card reveal" data-delay="300" style={{ border: "1px solid var(--error-container)" }}>
            <h2 className="text-headline-sm" style={{ marginBottom: "1rem", color: "var(--error)" }}>Danger Zone</h2>
            <p style={{ fontSize: 13, color: "var(--on-surface-variant)", marginBottom: "1.5rem" }}>
              Permanently delete your account and all associated financial data. This action cannot be undone.
            </p>
            <button className="btn btn-danger">Delete Account</button>
          </div>
        </div>
      </div>
    </div>
  );
}
