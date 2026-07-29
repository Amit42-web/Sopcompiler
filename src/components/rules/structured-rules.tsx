"use client";

import {
  ShieldCheck,
  Server,
  Scale,
  Database,
  CornerDownRight,
  Repeat,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  ConditionNode,
  MetadataCondition,
  RuleCategory,
  StructuredRule,
} from "@/lib/types";

const CATEGORY_META: Record<
  RuleCategory,
  { label: string; icon: typeof Scale }
> = {
  business_rule: { label: "Business Rules", icon: Scale },
  agent_obligation: { label: "Agent Obligations", icon: ShieldCheck },
  backend_action: { label: "Backend Actions", icon: Server },
  metadata_condition: { label: "Metadata Conditions", icon: Database },
};

const CATEGORY_ORDER: RuleCategory[] = [
  "business_rule",
  "agent_obligation",
  "backend_action",
  "metadata_condition",
];

function ConditionTree({ node }: { node: ConditionNode }) {
  if (node.type === "leaf") {
    return (
      <code
        className="rounded bg-muted px-2 py-0.5 text-xs"
        title={node.raw}
      >
        {node.fact} {node.operator.replace(/_/g, " ")} {String(node.value)}
      </code>
    );
  }
  return (
    <div className="space-y-1">
      <span className="text-xs font-semibold uppercase text-muted-foreground">
        {node.op === "all" ? "ALL of" : "ANY of"}
      </span>
      <div className="ml-3 space-y-1 border-l pl-3">
        {node.children.map((child, i) => (
          <div key={i}>
            <ConditionTree node={child} />
          </div>
        ))}
      </div>
    </div>
  );
}

function RuleCard({ rule }: { rule: StructuredRule }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-base">{rule.name}</CardTitle>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant={rule.obligation === "mandatory" ? "default" : "secondary"}
            >
              {rule.obligation}
            </Badge>
            {rule.branch !== "main" && (
              <Badge variant="warning">{rule.branch}</Badge>
            )}
            {rule.applies_to.length > 1 && (
              <Badge variant="outline" className="gap-1">
                <Repeat className="h-3 w-3" />
                reused ×{rule.applies_to.length}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {rule.preconditions.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
              Preconditions
            </p>
            <ul className="list-disc pl-5 text-muted-foreground">
              {rule.preconditions.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
        )}

        {rule.conditions && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
              Conditions
            </p>
            <ConditionTree node={rule.conditions} />
          </div>
        )}

        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
            Action
          </p>
          <code className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
            {rule.action.type} {rule.action.target}
            {rule.action.value !== undefined ? ` = ${rule.action.value}` : ""}
          </code>
        </div>

        {rule.validation_prompt && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2">
            <p className="text-xs font-semibold uppercase text-emerald-600 dark:text-emerald-400">
              Transcript validation
            </p>
            <p className="text-sm">{rule.validation_prompt}</p>
          </div>
        )}

        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
            Triggering scenario{rule.applies_to.length > 1 ? "s" : ""}
          </p>
          <div className="space-y-0.5">
            {rule.applies_to.map((b, i) => (
              <p
                key={i}
                className="flex items-start gap-1 text-xs text-muted-foreground"
              >
                <CornerDownRight className="mt-0.5 h-3 w-3 shrink-0" />
                {b.scenario}
                {b.preconditions.length > 0 && (
                  <span> — {b.preconditions.join("; ")}</span>
                )}
              </p>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function StructuredRules({
  rules,
  metadataConditions,
}: {
  rules: StructuredRule[];
  metadataConditions: MetadataCondition[];
}) {
  if (rules.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No rules extracted yet.</p>
    );
  }

  const byCategory = CATEGORY_ORDER.map((cat) => ({
    cat,
    rules: rules.filter((r) => r.category === cat),
  })).filter((g) => g.rules.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {byCategory.map((g) => {
          const { label, icon: Icon } = CATEGORY_META[g.cat];
          return (
            <Badge key={g.cat} variant="secondary" className="gap-1.5">
              <Icon className="h-3.5 w-3.5" />
              {label}: {g.rules.length}
            </Badge>
          );
        })}
      </div>

      {byCategory.map((g) => {
        const { label, icon: Icon } = CATEGORY_META[g.cat];
        return (
          <section key={g.cat} className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Icon className="h-4 w-4 text-primary" />
              {label}
            </h3>
            {g.rules.map((r) => (
              <RuleCard key={r.id} rule={r} />
            ))}
          </section>
        );
      })}

      {metadataConditions.length > 0 && (
        <section className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Database className="h-4 w-4 text-primary" />
            Metadata condition nodes
          </h3>
          <div className="flex flex-wrap gap-2">
            {metadataConditions.map((m, i) => (
              <code key={i} className="rounded bg-muted px-2 py-1 text-xs">
                {m.field}
              </code>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
