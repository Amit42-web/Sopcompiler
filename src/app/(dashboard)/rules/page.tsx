import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { RuleBuilder } from "@/components/rules/rule-builder";
import { sampleRules } from "@/lib/sample-data";

export const metadata: Metadata = {
  title: "Rule Builder",
};

export default function RulesPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Rule Builder"
        description="Review, edit, validate, and export your generated Rule Engine JSON."
      />
      <RuleBuilder initialRules={sampleRules} />
    </div>
  );
}
