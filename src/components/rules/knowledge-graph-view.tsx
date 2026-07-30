"use client";

import {
  GitBranch,
  Database,
  Split,
  MessageSquare,
  Server,
  Sparkles,
  Flag,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GraphNodeKind, KnowledgeGraph } from "@/lib/types";

const KIND_META: Record<
  GraphNodeKind,
  { label: string; icon: LucideIcon }
> = {
  scenario: { label: "Scenarios", icon: GitBranch },
  metadata: { label: "Metadata", icon: Database },
  decision: { label: "Decisions", icon: Split },
  customer_communication: { label: "Customer Communication", icon: MessageSquare },
  system_action: { label: "System Actions", icon: Server },
  ai_evaluation: { label: "AI Evaluations", icon: Sparkles },
  response: { label: "Responses", icon: Flag },
};

const ORDER: GraphNodeKind[] = [
  "scenario",
  "metadata",
  "decision",
  "customer_communication",
  "system_action",
  "ai_evaluation",
  "response",
];

export function KnowledgeGraphView({ graph }: { graph: KnowledgeGraph | null }) {
  if (!graph || graph.nodes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No knowledge graph yet — upload an SOP to build one.
      </p>
    );
  }

  const groups = ORDER.map((kind) => ({
    kind,
    nodes: graph.nodes.filter((n) => n.kind === kind),
  })).filter((g) => g.nodes.length > 0);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        The SOP is parsed into a knowledge graph ({graph.nodes.length} nodes,{" "}
        {graph.edges.length} edges) which is then compiled into the Rule Engine
        decision tree.
      </p>

      <div className="flex flex-wrap gap-2">
        {groups.map((g) => {
          const { label, icon: Icon } = KIND_META[g.kind];
          return (
            <Badge key={g.kind} variant="secondary" className="gap-1.5">
              <Icon className="h-3.5 w-3.5" />
              {label}: {g.nodes.length}
            </Badge>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {groups.map((g) => {
          const { label, icon: Icon } = KIND_META[g.kind];
          return (
            <Card key={g.kind}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Icon className="h-4 w-4 text-primary" />
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {g.nodes.map((n) => (
                  <div key={n.id} className="text-sm">
                    <span>{n.label}</span>
                    {n.scenario && g.kind !== "scenario" && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        · {n.scenario}
                      </span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
