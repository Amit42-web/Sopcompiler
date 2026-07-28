import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { TeamManager } from "@/components/team/team-manager";

export const metadata: Metadata = {
  title: "Team",
};

export default function TeamPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Team"
        description="Invite people to your workspace and manage their access."
      />
      <TeamManager />
    </div>
  );
}
