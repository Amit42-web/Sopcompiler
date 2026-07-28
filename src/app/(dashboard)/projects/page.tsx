import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { ProjectsView } from "@/components/projects/projects-view";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Projects"
        description="Each project holds its SOPs, extracted data, rules, and history."
      />
      <ProjectsView />
    </div>
  );
}
