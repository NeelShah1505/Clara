import type { Metadata, Viewport } from "next";
import ScrollObserver from "./components/ScrollObserver";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Clara — Personal Finance, Reimagined",
    template: "%s | Clara",
  },
  description:
    "Clara is your sophisticated personal finance architect. Track expenses, income, budgets, subscriptions, and net worth — beautifully.",
  keywords: ["personal finance", "expense tracker", "budget", "money management", "Clara"],
  authors: [{ name: "Clara Finance" }],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Clara",
    title: "Clara — Personal Finance, Reimagined",
    description: "Track your wealth with intelligence. Clara is a premium personal finance tracker.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1a1a1a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect for fonts — already loaded via globals.css @import */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
      </head>
      <body>
        <ScrollObserver />
        {children}
      </body>
    </html>
  );
}
