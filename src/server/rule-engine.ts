/**
 * Rule Engine decision-tree builder.
 *
 * Converts the extracted structured rules into an executable decision tree of
 * typed blocks (Attribute → Condition → Validate Info / Prompt → Response) with
 * YES/NO/NA routing, per the Rule Engine knowledge base. Metadata drives
 * Attribute/Condition blocks; mandatory agent communications become Validate
 * Info blocks; subjective, transcript-only checks become Prompt blocks; every
 * branch terminates in a Response block.
 *
 * This is a deterministic approximation. When `ANTHROPIC_API_KEY` is set,
 * `llm.buildRuleEngineTree` produces the tree directly from the SOP using the
 * knowledge base as its system prompt.
 */

import type {
  ConditionNode,
  RuleEngineBlock,
  RuleEngineTree,
  RuleOperator,
  StructuredRule,
} from "@/lib/types";
import { newId } from "@/server/id";

// Transcript-quality checks (AI judgement) vs. factual communication checks.
const SUBJECTIVE =
  /educat|correct|proper|complete|all mandatory|verify.*(concern|issue)|quality|understand|reassur|empath|appropriat|politely|professional/i;

interface Leaf {
  raw: string;
  fact: string;
  operator: RuleOperator;
  value: string | number | boolean;
}

function flattenLeaves(node: ConditionNode | null): Leaf[] {
  if (!node) return [];
  if (node.type === "leaf")
    return [
      { raw: node.raw, fact: node.fact, operator: node.operator, value: node.value },
    ];
  return node.children.flatMap(flattenLeaves);
}

export function buildDecisionTree(
  name: string,
  rules: StructuredRule[]
): RuleEngineTree {
  const blocks: RuleEngineBlock[] = [];
  const add = (b: Omit<RuleEngineBlock, "id">): string => {
    const id = newId("blk");
    blocks.push({ id, ...b });
    return id;
  };

  // Terminal responses (shared).
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

  // Only metadata/business conditions and agent obligations belong in a
  // compliance tree; backend/system actions are excluded per the knowledge base.
  const relevant = rules
    .filter((r) => r.action_kind === "agent_action" || r.conditions)
    .sort((a, b) => a.order - b.order);

  // Build the spine in reverse so each segment routes into the next.
  let next = followed;

  for (let i = relevant.length - 1; i >= 0; i--) {
    const r = relevant[i];
    let entry = next;

    // Obligation block: Validate Info (factual) or Prompt (subjective).
    if (r.action_kind === "agent_action" && r.validation_prompt) {
      const type = SUBJECTIVE.test(r.validation_prompt)
        ? ("prompt" as const)
        : ("validate_info" as const);
      entry = add({
        type,
        label: r.name,
        prompt: r.validation_prompt,
        yes: entry,
        no: notFollowed,
        na,
      });
    }

    // Condition blocks (Attribute read + Condition evaluate) gate the obligation.
    const leaves = flattenLeaves(r.conditions);
    for (let j = leaves.length - 1; j >= 0; j--) {
      const leaf = leaves[j];
      const condId = add({
        type: "condition",
        label: `${leaf.fact} ${leaf.operator.replace(/_/g, " ")} ${leaf.value}`,
        attribute: leaf.fact,
        operator: leaf.operator,
        value: leaf.value,
        yes: entry, // condition met → continue
        no: na, // not applicable → NA (never evaluate an SOP that doesn't apply)
        na,
      });
      const attrId = add({
        type: "attribute",
        label: `Read ${leaf.fact.replace(/_/g, " ")}`,
        attribute: leaf.fact,
        next: condId,
      });
      entry = attrId;
    }

    next = entry;
  }

  return {
    name: name || "Rule Engine",
    version: "1.0.0",
    root: next === followed ? null : next,
    blocks,
  };
}
