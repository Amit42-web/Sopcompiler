import type { Metadata } from "next";

import "./globals.css";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export const metadata: Metadata = {
  title: {
    default: "RuleForge AI",
    template: "%s · RuleForge AI",
  },
  description:
    "Convert Standard Operating Procedure documents into executable Rule Engine JSON.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <DashboardShell>{children}</DashboardShell>
      </body>
    </html>
  );
}
