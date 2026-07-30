/**
 * SOP → Knowledge Graph.
 *
 * Turns the extracted structured rules into a typed knowledge graph whose nodes
 * are the things the Rule Engine cares about: scenarios, metadata, decisions,
 * customer communication, system actions, AI evaluations, and responses. The
 * graph is the intermediate representation the decision-tree compiler consumes
 * (`rule-engine.ts`).
 */

import type {
  ConditionNode,
  GraphEdge,
  GraphNode,
  KnowledgeGraph,
  RuleOperator,
  SopSection,
  StructuredRule,
} from "@/lib/types";
import { newId } from "@/server/id";

// Subjective transcript checks (AI judgement) vs. factual communication.
const SUBJECTIVE =
  /educat|correct|proper|complete|all mandatory|verify.*(concern|issue)|quality|understand|reassur|empath|appropriat|politely|professional/i;

interface Leaf {
  raw: string;
  fact: string;
  operator: RuleOperator;
  value: string | number | boolean;
}

export function flattenLeaves(node: ConditionNode | null): Leaf[] {
  if (!node) return [];
  if (node.type === "leaf")
    return [
      { raw: node.raw, fact: node.fact, operator: node.operator, value: node.value },
    ];
  return node.children.flatMap(flattenLeaves);
}

export function buildKnowledgeGraph(
  sections: SopSection[],
  rules: StructuredRule[]
): KnowledgeGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const add = (n: Omit<GraphNode, "id">): string => {
    const id = newId("gn");
    nodes.push({ id, ...n });
    return id;
  };

  // Scenario order: SOP section order first, then any extra from rule bindings.
  const scenarioOrder: string[] = [];
  for (const s of sections)
    if (s.text.trim() && !scenarioOrder.includes(s.title))
      scenarioOrder.push(s.title);
  for (const r of rules)
    for (const b of r.applies_to)
      if (!scenarioOrder.includes(b.scenario)) scenarioOrder.push(b.scenario);

  const scenarioNode = new Map<string, string>();
  for (const sc of scenarioOrder) {
    scenarioNode.set(sc, add({ kind: "scenario", label: sc, scenario: sc }));
  }

  // Shared response nodes.
  add({ kind: "response", label: "SOP Followed" });
  add({ kind: "response", label: "SOP Not Followed" });
  add({ kind: "response", label: "Not Applicable" });

  for (const r of rules) {
    const scenario = r.applies_to[0]?.scenario ?? scenarioOrder[0] ?? "General";
    const scId = scenarioNode.get(scenario);

    // Metadata + decision nodes from the rule's conditions.
    for (const leaf of flattenLeaves(r.conditions)) {
      const mid = add({
        kind: "metadata",
        label: `${leaf.fact} ${leaf.operator.replace(/_/g, " ")} ${leaf.value}`,
        scenario,
        attribute: leaf.fact,
        operator: leaf.operator,
        value: leaf.value,
        raw: leaf.raw,
      });
      if (scId) edges.push({ from: scId, to: mid, type: "decides" });
    }

    // Communication / AI / system nodes from the rule's action.
    if (r.action_kind === "agent_action" && r.validation_prompt) {
      const kind = SUBJECTIVE.test(r.validation_prompt)
        ? ("ai_evaluation" as const)
        : ("customer_communication" as const);
      const nid = add({
        kind,
        label: r.name,
        scenario,
        prompt: r.validation_prompt,
        obligation: r.obligation,
        raw: r.raw,
      });
      if (scId)
        edges.push({
          from: scId,
          to: nid,
          type: kind === "ai_evaluation" ? "evaluates" : "communicates",
        });
    } else if (r.action_kind === "backend_action") {
      const nid = add({
        kind: "system_action",
        label: r.name,
        scenario,
        raw: r.raw,
      });
      if (scId) edges.push({ from: scId, to: nid, type: "acts" });
    }
  }

  return { nodes, edges };
}
