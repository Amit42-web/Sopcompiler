import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Dashboard"
        description="A live view of your workspace — updated as SOPs are processed."
      />
      <DashboardView />
    </div>
  );
}
