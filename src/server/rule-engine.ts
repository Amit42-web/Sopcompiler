/**
 * Knowledge Graph → Rule Engine decision tree.
 *
 * Compiles the knowledge graph into an executable decision tree of typed blocks
 * (Attribute → Condition → Validate Info / Prompt → Response) by applying
 * explicit architectural rules rather than "just generating JSON":
 *
 *   1. Every scenario starts with an applicability check.
 *   2. Every metadata check uses an Attribute followed by a Condition.
 *   3. Never use a Prompt where metadata is sufficient (prompts come only from
 *      AI-evaluation nodes; metadata always becomes Attribute+Condition).
 *   4. Never evaluate unrelated scenarios (applicability NO skips to the next
 *      scenario; a scenario's branch contains only its own nodes).
 *   5. One scenario = one independent branch.
 *   6. Every branch ends with a Response.
 *   7. Avoid duplicated Validate Info blocks (deduped within a branch).
 *   8. Reuse common logic where possible (shared Response blocks).
 *
 * When `ANTHROPIC_API_KEY` is set, `llm.buildRuleEngineTree` builds the tree
 * directly from the SOP with the knowledge base as its system prompt; this
 * deterministic compiler is the fallback.
 */

import type {
  GraphNode,
  KnowledgeGraph,
  RuleEngineBlock,
  RuleEngineTree,
  SopSection,
  StructuredRule,
} from "@/lib/types";
import { newId } from "@/server/id";
import { buildKnowledgeGraph } from "@/server/knowledge-graph";

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function compileGraphToTree(
  name: string,
  graph: KnowledgeGraph
): RuleEngineTree {
  const blocks: RuleEngineBlock[] = [];
  const add = (b: Omit<RuleEngineBlock, "id">): string => {
    const id = newId("blk");
    blocks.push({ id, ...b });
    return id;
  };

  // Rule 8: shared terminal responses.
  const followed = add({
    type: "response",
    label: "SOP Followed",
    response: "SOP Followed",
  });
  const notFollowed = add({
    type: "response",
    label: "SOP Not Followed",
    response: "SOP Not Followed",
  });
  const na = add({ type: "response", label: "Not Applicable", response: "NA" });

  const scenarios = graph.nodes.filter((n) => n.kind === "scenario");
  const owned = (scenario: string, kind: GraphNode["kind"]) =>
    graph.nodes.filter((n) => n.scenario === scenario && n.kind === kind);

  // Build scenarios back-to-front so each applicability NO routes to the next
  // scenario's entry (Rule 4 & 5: independent branches, no cross-evaluation).
  let nextScenarioEntry = na;

  for (let i = scenarios.length - 1; i >= 0; i--) {
    const sc = scenarios[i];
    const scenario = sc.scenario ?? sc.label;

    const metas = owned(scenario, "metadata");
    const comms = owned(scenario, "customer_communication");
    const ais = owned(scenario, "ai_evaluation");

    // A scenario with nothing to evaluate is skipped (no empty branch).
    if (metas.length === 0 && comms.length === 0 && ais.length === 0) continue;

    // Build the branch tail-first, ending at "SOP Followed" (Rule 6).
    let step = followed;
    const seen = new Set<string>(); // Rule 7: no duplicate Validate Info/Prompt.

    // AI evaluations → Prompt blocks (Rule 3: only subjective checks).
    for (let k = ais.length - 1; k >= 0; k--) {
      const n = ais[k];
      const key = `p:${norm(n.prompt ?? n.label)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      step = add({
        type: "prompt",
        label: n.label,
        prompt: n.prompt,
        yes: step,
        no: notFollowed,
        na,
      });
    }

    // Customer communication → Validate Info blocks.
    for (let k = comms.length - 1; k >= 0; k--) {
      const n = comms[k];
      const key = `v:${norm(n.prompt ?? n.label)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      step = add({
        type: "validate_info",
        label: n.label,
        prompt: n.prompt,
        yes: step,
        no: notFollowed,
        na,
      });
    }

    // Non-applicability metadata checks → Attribute + Condition (Rule 2).
    for (let k = metas.length - 1; k >= 1; k--) {
      const leaf = metas[k];
      const cond = add({
        type: "condition",
        label: leaf.label,
        attribute: leaf.attribute,
        operator: leaf.operator,
        value: leaf.value,
        yes: step,
        no: na,
        na,
      });
      step = add({
        type: "attribute",
        label: `Read ${(leaf.attribute ?? "").replace(/_/g, " ")}`,
        attribute: leaf.attribute,
        next: cond,
      });
    }

    // Rule 1: every scenario starts with an applicability check. Use the first
    // metadata condition as the applicability gate; otherwise a generic one.
    let entry: string;
    if (metas.length > 0) {
      const leaf = metas[0];
      const cond = add({
        type: "condition",
        label: `Applicable? ${leaf.label}`,
        attribute: leaf.attribute,
        operator: leaf.operator,
        value: leaf.value,
        yes: step,
        no: nextScenarioEntry, // Rule 4: skip to next scenario, don't fail
        na: nextScenarioEntry,
      });
      entry = add({
        type: "attribute",
        label: `Read ${(leaf.attribute ?? "").replace(/_/g, " ")}`,
        attribute: leaf.attribute,
        next: cond,
      });
    } else {
      entry = add({
        type: "condition",
        label: `Does "${sc.label}" apply?`,
        attribute: "scenario_applies",
        operator: "equals",
        value: true,
        yes: step,
        no: nextScenarioEntry,
        na: nextScenarioEntry,
      });
    }

    nextScenarioEntry = entry;
  }

  return {
    name: name || "Rule Engine",
    version: "1.0.0",
    root: nextScenarioEntry === na ? null : nextScenarioEntry,
    blocks,
  };
}

/** Convenience: SOP sections + rules → knowledge graph → decision tree. */
export function buildDecisionTree(
  name: string,
  sections: SopSection[],
  rules: StructuredRule[]
): { graph: KnowledgeGraph; tree: RuleEngineTree } {
  const graph = buildKnowledgeGraph(sections, rules);
  return { graph, tree: compileGraphToTree(name, graph) };
}
