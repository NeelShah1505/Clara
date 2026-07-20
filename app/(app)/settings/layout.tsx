"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ReactNode } from "react";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const tabs = [
    { name: "General", href: "/settings" },
    { name: "Integrations", href: "/settings/integrations" }
  ];

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <div className="page-header" style={{ marginBottom: "1rem" }}>
        <h1>Settings</h1>
        <p>Manage your preferences, account, and integrations.</p>
      </div>

      <div style={{ display: "flex", gap: "2rem", borderBottom: "1px solid var(--border-color)", marginBottom: "2rem" }}>
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link 
              key={tab.name} 
              href={tab.href}
              style={{
                padding: "0.75rem 0",
                fontWeight: 600,
                fontSize: 15,
                color: isActive ? "var(--brand-purple)" : "var(--on-surface-variant)",
                borderBottom: isActive ? "2px solid var(--brand-purple)" : "2px solid transparent",
                transition: "0.2s"
              }}
            >
              {tab.name}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
