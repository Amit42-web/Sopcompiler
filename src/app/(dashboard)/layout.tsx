import { DashboardShell } from "@/components/layout/dashboard-shell";

/**
 * Authenticated application layout. Wraps every dashboard route in the
 * sidebar + top bar shell. (Auth is added in a later sprint.)
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
