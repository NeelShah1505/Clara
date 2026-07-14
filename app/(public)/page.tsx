import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Clara — Track Wealth with Intelligence",
  description:
    "Clara is the sophisticated personal finance architect. Track expenses, set budgets, monitor goals, and get powerful insights — beautifully designed.",
};

const FEATURES = [
  { icon: "category",        title: "Smart Categorization",  desc: "Automatically sort every transaction into logical buckets with our AI-powered engine.",                           color: "var(--brand-pink)" },
  { icon: "monitoring",      title: "Real-time Analytics",   desc: "Watch your wealth grow with instant updates and editorially beautiful data visualisations.",                      color: "var(--brand-green)" },
  { icon: "security",        title: "Bank-grade Security",   desc: "End-to-end encrypted, server-side verified. Your data never leaves your control.",                              color: "var(--brand-yellow)" },
  { icon: "autorenew",       title: "Recurring Intelligence", desc: "Detect, forecast and manage subscriptions and recurring bills before they surprise you.",                        color: "var(--brand-blue)" },
  { icon: "flag",            title: "Savings Goals",         desc: "Set goals, track progress in real time, and celebrate every milestone on the path to financial freedom.",        color: "var(--brand-pink)" },
  { icon: "summarize",       title: "PDF Reports",           desc: "Generate beautiful monthly or custom-range expense reports with one click and export them anywhere.",             color: "var(--brand-green)" },
];

const STEPS = [
  { number: "01", icon: "account_balance",  title: "Connect Accounts",     desc: "Securely add your wallets and bank accounts in seconds." },
  { number: "02", icon: "account_tree",     title: "Categorize Expenses",  desc: "Let Clara's AI organise every transaction automatically." },
  { number: "03", icon: "insights",         title: "Analyze & Grow",       desc: "Get deep insights into your net worth and financial growth over time." },
];

export default function LandingPage() {
  return (
    <div style={{ background: "var(--background)", minHeight: "100vh" }}>
      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(252,249,248,0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(0,0,0,0.05)",
      }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 2rem", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.04em", color: "var(--primary)" }}>Clara</span>
          <nav style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
            <a href="#features" className="nav-link" style={{ fontSize: 14, fontWeight: 500, color: "var(--on-surface-variant)", transition: "color 150ms" }}>
              Features
            </a>
            <a href="#how-it-works" className="nav-link" style={{ fontSize: 14, fontWeight: 500, color: "var(--on-surface-variant)", transition: "color 150ms" }}>
              Platform
            </a>
          </nav>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Link href="/login" className="btn btn-ghost" style={{ fontSize: 14 }}>Log in</Link>
            <Link href="/signup" className="btn btn-primary" style={{ fontSize: 14 }}>Get Started →</Link>
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero ─────────────────────────────────────────────────────────────── */}
        <section style={{ padding: "7rem 2rem 5rem", overflow: "hidden" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            {/* Live badge */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
              padding: "0.375rem 1rem", borderRadius: "var(--radius-full)",
              background: "var(--surface-container-high)",
              border: "1px solid rgba(0,0,0,0.06)",
              marginBottom: "2rem",
            }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--brand-pink)", display: "inline-block", animation: "pulse 2s infinite" }} />
              <span className="text-label-caps" style={{ color: "var(--on-surface-variant)" }}>Clara 2.0 is live</span>
            </div>

            {/* Headline */}
            <h1 style={{
              fontSize: "clamp(2.5rem, 6vw, 5rem)", fontWeight: 800,
              letterSpacing: "-0.04em", lineHeight: 1.1,
              color: "var(--on-surface)", maxWidth: 820, marginBottom: "1.5rem",
            }}>
              Track Wealth with{" "}
              <span style={{
                background: "linear-gradient(135deg, #1a1a1a 0%, #605e57 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
                Intelligence.
              </span>
            </h1>

            <p style={{ fontSize: 18, fontWeight: 400, color: "var(--on-surface-variant)", maxWidth: 600, marginBottom: "2.5rem", lineHeight: 1.65 }}>
              The sophisticated architect for your personal finances. Experience an organised, calm, and intellectually rigorous approach to modern wealth management.
            </p>

            {/* CTAs */}
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
              <Link href="/signup" className="btn btn-primary btn-lg" style={{ padding: "0.875rem 2rem", fontSize: 16, boxShadow: "0 8px 30px rgba(26,26,26,0.2)" }}>
                Start Building
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
              </Link>
              <Link href="/login" className="btn btn-secondary btn-lg" style={{ padding: "0.875rem 2rem", fontSize: 16 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>play_circle</span>
                View Demo
              </Link>
            </div>

            {/* App preview mockup */}
            <div style={{ marginTop: "5rem", position: "relative", width: "100%", maxWidth: 900 }}>
              {/* Glow */}
              <div style={{
                position: "absolute", inset: -2,
                background: "linear-gradient(135deg, var(--brand-pink), var(--brand-yellow), var(--brand-green))",
                borderRadius: "2rem", filter: "blur(24px)", opacity: 0.3, pointerEvents: "none",
              }} />
              {/* Mock UI */}
              <div style={{
                position: "relative", background: "#fff", borderRadius: "1.5rem",
                padding: "1rem", boxShadow: "var(--shadow-popover)",
                border: "1px solid rgba(0,0,0,0.06)",
              }}>
                <div style={{ display: "flex", gap: "1rem" }}>
                  {/* Faux sidebar */}
                  <div style={{ width: 160, background: "var(--primary)", borderRadius: "1rem", padding: "1.25rem 1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div style={{ height: 16, width: 60, background: "rgba(255,255,255,0.15)", borderRadius: 8 }} />
                    {["","","",""].map((_,i) => (
                      <div key={i} style={{ height: 10, width: `${60 + i * 10}%`, background: "rgba(255,255,255,0.08)", borderRadius: 6 }} />
                    ))}
                  </div>
                  {/* Faux canvas */}
                  <div style={{ flex: 1, background: "var(--brand-cream)", borderRadius: "1rem", padding: "1.25rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div style={{ gridColumn: "1/-1", display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <div style={{ height: 18, width: 140, background: "var(--surface-variant)", borderRadius: 6 }} />
                      <div style={{ display: "flex", gap: 6 }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--surface-variant)" }} />
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--surface-variant)" }} />
                      </div>
                    </div>
                    <div style={{ background: "var(--brand-yellow)", borderRadius: "1rem", padding: "1rem", display: "flex", flexDirection: "column", justifyContent: "space-between", height: 100 }}>
                      <div style={{ height: 10, width: 70, background: "rgba(0,0,0,0.15)", borderRadius: 5 }} />
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 50 }}>
                        {[0.6, 0.4, 1, 0.3].map((h, i) => (
                          <div key={i} style={{ flex: 1, height: `${h * 100}%`, background: "rgba(0,0,0,0.25)", borderRadius: "3px 3px 0 0" }} />
                        ))}
                      </div>
                    </div>
                    <div style={{ background: "var(--brand-pink)", borderRadius: "1rem", padding: "1rem", height: 100, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div style={{ height: 10, width: 90, background: "rgba(0,0,0,0.15)", borderRadius: 5 }} />
                      <svg viewBox="0 0 100 36" style={{ width: "100%", height: 44, stroke: "rgba(0,0,0,0.35)", strokeWidth: 2, fill: "none", strokeLinecap: "round" }}>
                        <path d="M0,28 Q15,18 28,22 T55,12 T80,6 T100,10" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ──────────────────────────────────────────────────────────── */}
        <section id="features" style={{ padding: "6rem 2rem", background: "#fff" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            <div style={{ textAlign: "center", maxWidth: 560, margin: "0 auto 4rem" }}>
              <h2 className="text-headline-md reveal" style={{ marginBottom: "0.75rem" }}>Tactile insights, effortless control.</h2>
              <p className="reveal" style={{ color: "var(--on-surface-variant)", fontSize: 16, lineHeight: 1.65 }}>
                We replaced harsh financial tropes with a nuanced, editorial language built for long data-analysis sessions.
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
              {FEATURES.map((f, i) => (
                <div
                  key={f.title}
                  className="card reveal"
                  data-delay={`${i * 50}` as "50" | "100" | "150" | "200" | "250" | "300"}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: "var(--radius-md)",
                    background: f.color, display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: "1.25rem",
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 22, color: "var(--primary)" }}>{f.icon}</span>
                  </div>
                  <h3 className="text-headline-sm" style={{ marginBottom: "0.5rem" }}>{f.title}</h3>
                  <p style={{ fontSize: 14, color: "var(--on-surface-variant)", lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ──────────────────────────────────────────────────────── */}
        <section id="how-it-works" style={{ padding: "6rem 2rem" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            <div style={{ textAlign: "center", maxWidth: 560, margin: "0 auto 4rem" }}>
              <h2 className="text-headline-md reveal" style={{ marginBottom: "0.75rem" }}>Our Process</h2>
              <p className="reveal" style={{ color: "var(--on-surface-variant)", fontSize: 16 }}>
                Three simple steps to mastering your financial architecture with Clara.
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "2rem" }}>
              {STEPS.map((step, i) => (
                <div key={step.number} className="reveal" data-delay={`${i * 100}` as "100" | "200"} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-0.05em", color: "var(--surface-container-highest)" }}>
                    {step.number}
                  </div>
                  <div style={{
                    width: 52, height: 52, borderRadius: "var(--radius-md)",
                    background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 24, color: "#fff" }}>{step.icon}</span>
                  </div>
                  <h3 className="text-headline-sm">{step.title}</h3>
                  <p style={{ fontSize: 14, color: "var(--on-surface-variant)", lineHeight: 1.65 }}>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA banner ────────────────────────────────────────────────────────── */}
        <section style={{ padding: "5rem 2rem" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            <div className="reveal" style={{
              background: "var(--primary)", borderRadius: "var(--radius-xl)",
              padding: "4rem 3rem", textAlign: "center",
              position: "relative", overflow: "hidden",
            }}>
              {/* Decorative glows */}
              <div style={{ position: "absolute", top: -60, right: -60, width: 240, height: 240, borderRadius: "50%", background: "var(--brand-pink)", filter: "blur(80px)", opacity: 0.15 }} />
              <div style={{ position: "absolute", bottom: -60, left: -60, width: 240, height: 240, borderRadius: "50%", background: "var(--brand-yellow)", filter: "blur(80px)", opacity: 0.12 }} />
              <h2 style={{ fontSize: 36, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", marginBottom: "1rem" }}>
                Financial serenity starts here.
              </h2>
              <p style={{ fontSize: 16, color: "rgba(255,255,255,0.65)", maxWidth: 480, margin: "0 auto 2.5rem", lineHeight: 1.65 }}>
                Join thousands of professionals who use Clara to build a better relationship with their money.
              </p>
              <Link href="/signup" className="btn btn-lg" style={{
                background: "#fff", color: "var(--primary)", fontSize: 16, fontWeight: 700,
                padding: "0.875rem 2.5rem",
                boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
              }}>
                Create Free Account →
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────────────── */}
      <footer style={{ background: "#fff", borderTop: "1px solid rgba(0,0,0,0.06)", padding: "3.5rem 2rem 2rem" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "2rem" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.04em", marginBottom: "0.75rem" }}>Clara</div>
            <p style={{ fontSize: 14, color: "var(--on-surface-variant)", lineHeight: 1.65, maxWidth: 280 }}>
              The Sophisticated Architect for your personal wealth management.
            </p>
          </div>
          {[
            { heading: "Product", links: ["Features", "Platform", "Changelog"] },
            { heading: "Legal", links: ["Privacy Policy", "Terms of Service", "Security"] },
            { heading: "Account", links: ["Log in", "Sign up", "Dashboard"] },
          ].map((col) => (
            <div key={col.heading}>
              <p className="text-label-caps" style={{ color: "var(--primary)", marginBottom: "1rem" }}>{col.heading}</p>
              <ul style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="nav-link" style={{ fontSize: 14, color: "var(--on-surface-variant)", transition: "color 150ms" }}>
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ maxWidth: 1280, margin: "2rem auto 0", paddingTop: "1.5rem", borderTop: "1px solid rgba(0,0,0,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <p style={{ fontSize: 13, color: "var(--on-surface-variant)" }}>© 2025 Clara Finance. All rights reserved.</p>
        </div>
      </footer>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .nav-link:hover {
          color: var(--primary) !important;
        }
      `}</style>
    </div>
  );
}
