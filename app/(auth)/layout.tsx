import type { ReactNode } from "react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--background)",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
    }}>
      {/* ── Left brand panel ─────────────────────────────────────────────────── */}
      <div style={{
        background: "var(--primary)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "3rem",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Decorative glows */}
        <div style={{ position: "absolute", top: -80, right: -80, width: 320, height: 320, borderRadius: "50%", background: "var(--brand-pink)", filter: "blur(90px)", opacity: 0.18, pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -80, left: -80, width: 280, height: 280, borderRadius: "50%", background: "var(--brand-yellow)", filter: "blur(80px)", opacity: 0.14, pointerEvents: "none" }} />

        {/* Logo */}
        <Link href="/" style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.04em", color: "#fff", position: "relative", zIndex: 1 }}>
          Clara
        </Link>

        {/* Tagline */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <blockquote style={{ fontSize: "clamp(1.5rem, 2.5vw, 2.25rem)", fontWeight: 700, color: "#fff", lineHeight: 1.25, letterSpacing: "-0.03em", marginBottom: "1.25rem" }}>
            "Financial serenity and effortless control — in one place."
          </blockquote>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>
            The Sophisticated Architect for your personal wealth management.
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: "2rem", position: "relative", zIndex: 1 }}>
          {[
            { value: "₹50L+", label: "tracked daily" },
            { value: "10k+",  label: "active users" },
            { value: "99.9%", label: "uptime" },
          ].map((s) => (
            <div key={s.label}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right form panel ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem 2rem" }}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          {children}
        </div>
      </div>

      {/* Responsive — collapse left panel on mobile */}
      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
          div[style*="background: var(--primary)"] {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
