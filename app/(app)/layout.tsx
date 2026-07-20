import ClientLayout from "./ClientLayout";
import { ReactNode } from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function AppServerLayout({ children }: { children: ReactNode }) {
  return (
    <ClientLayout>
      {children}
    </ClientLayout>
  );
}
