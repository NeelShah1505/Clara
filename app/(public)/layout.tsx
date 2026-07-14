import type { ReactNode } from "react";

export const metadata = {
  title: { default: "Personal Expense Tracker", template: "%s | Expense Tracker" },
  description: "Track your personal finances — expenses, income, budgets, and more.",
};

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div data-layout="public">
      {/* Public header/nav placeholder — replaced in Phase 6 */}
      {children}
    </div>
  );
}
