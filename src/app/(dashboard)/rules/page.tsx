import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { RulesWorkspace } from "@/components/rules/rules-workspace";

export const metadata: Metadata = {
  title: "Rule Builder",
};

export default function RulesPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Rule Builder"
        description="Rules generated from your uploaded SOPs — review, edit, validate, and export."
      />
      <RulesWorkspace />
    </div>
  );
}
