/**
 * Knowledge Graph → Rule Engine build spec (layered gear/branch format).
 *
 * Emits the `rule_engine_build_spec` JSON: Layer 0 selects the SOP via a Tags
 * attribute; Layer 1 names the scenarios, each branch carrying a gear (Single
 * or Group block of metadata conditions); Layers 2/3 are Moment prompt blocks
 * (intent check → info-shared); a single Response block holds YES/NO and every
 * Else Path connects to response.NO.
 *
 * When `ANTHROPIC_API_KEY` is set, `llm.buildEngineSpec` produces this directly
 * from the SOP using the build-spec rules as its system prompt.
 */

import type {
  BuildBranch,
  BuildGear,
  BuildLayerBlock,
  GearCondition,
  GraphNode,
  KnowledgeGraph,
  RuleEngineBuildSpec,
  SopSection,
  StructuredRule,
} from "@/lib/types";
import { buildKnowledgeGraph } from "@/server/knowledge-graph";

export const BUILD_SPEC_RULES = [
  "Every conditional block has Else Path always ON.",
  "A conditional block only NAMES its branches. The gear config lives on each BRANCH, not on the block.",
  "Gear -> Single block = one condition. Gear -> Group block = two or more conditions joined by AND / OR.",
  "Layer 0: gear -> Single block -> Attribute -> select category 'Tags' -> search and select the key. No 'Validate information' step.",
  "Deeper layers: gear -> Single block (or Group block) -> Attribute -> Validate information -> category -> key -> operator -> match against.",
  "Moment condition = toggle to Prompt based, then write prompt.",
  "Multiple moments are never grouped. Each moment gets its own layer.",
  "Response block is created ONCE, holds YES and NO. All later branches connect into it.",
  "Every Else Path connects to the NO response block.",
];

function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "scenario"
  );
}

function gearCondition(node: GraphNode): GearCondition {
  return {
    condition: "Attribute",
    action: "Validate information",
    block_name: node.label.slice(0, 60),
    attribute_category: "call_metadata",
    key: node.attribute ?? slug(node.label),
    operator: node.operator,
    match_against: { value: node.value },
  };
}

function metadataGear(metas: GraphNode[]): BuildGear | null {
  if (metas.length === 0) return null;
  if (metas.length === 1) {
    const m = metas[0];
    return {
      type: "Single block",
      condition: "Attribute",
      action: "Validate information",
      attribute_category: "call_metadata",
      key: m.attribute ?? slug(m.label),
      operator: m.operator,
      match_against: { value: m.value },
    };
  }
  return {
    type: "Group block",
    operator: "AND",
    conditions: metas.map(gearCondition),
  };
}

function intentPrompt(node: GraphNode): string {
  const base = (node.prompt ?? node.label).replace(/\s+/g, " ").trim();
  return `${base} Output YES or NO.`;
}

function infoPrompt(scenario: string, comms: GraphNode[]): string {
  const required =
    comms
      .map((c) => (c.prompt ?? c.label).replace(/^did the agent\s*/i, "").replace(/\?$/, ""))
      .join("; ") || "shared the required information";
  return `'${scenario}': did the agent ${required}? YES or NO with a one-line reason.`;
}

function momentBlock(
  id: string,
  parent: string,
  blockName: string,
  prompt: string,
  onYes: string
): BuildLayerBlock {
  return {
    id,
    created_by: "Hover right of branch -> + -> Conditional block",
    parent_branch: parent,
    block_name: blockName,
    gear: {
      type: "Single block",
      condition: "Moment",
      mode: "Prompt based",
      llm_prompt: prompt,
    },
    branches: [
      { name: "Yes", connect_to: onYes },
      { name: "Else Path", connect_to: "response.NO" },
    ],
  };
}

/**
 * Verify the spec is safe to import into the rule engine: required layers
 * present, and every branch reference (on_yes / on_else / connect_to) resolves
 * to a real target. Used to reject a malformed LLM spec so the always-valid
 * deterministic builder is used instead.
 */
export function validateBuildSpec(
  spec: RuleEngineBuildSpec | null | undefined
): boolean {
  if (!spec || !spec.layer_0 || !spec.layer_1 || !spec.response) return false;

  const targets = new Set<string>(["response.YES", "response.NO"]);
  targets.add(`layer_1.${spec.layer_1.id}`);
  for (const b of spec.layer_2 ?? []) targets.add(`layer_2.${b.id}`);
  for (const b of spec.layer_3 ?? []) targets.add(`layer_3.${b.id}`);

  const refs: (string | undefined)[] = [];
  const collect = (branches?: BuildBranch[]) =>
    branches?.forEach((br) => refs.push(br.on_yes, br.on_else, br.connect_to));
  collect(spec.layer_0.branches);
  collect(spec.layer_1.branches);
  for (const b of spec.layer_2 ?? []) collect(b.branches);
  for (const b of spec.layer_3 ?? []) collect(b.branches);

  return refs.filter(Boolean).every((r) => targets.has(r as string));
}

export function buildBuildSpec(
  name: string,
  sections: SopSection[],
  rules: StructuredRule[]
): RuleEngineBuildSpec {
  const graph = buildKnowledgeGraph(sections, rules);
  const scenarioNodes = graph.nodes.filter((n) => n.kind === "scenario");
  const owned = (scenario: string, kind: GraphNode["kind"]) =>
    graph.nodes.filter((n) => n.scenario === scenario && n.kind === kind);

  const layer1Id = slug(`${name}_scenarios`);
  const layer1Branches: BuildBranch[] = [];
  const layer2: BuildLayerBlock[] = [];
  const layer3: BuildLayerBlock[] = [];

  for (const sc of scenarioNodes) {
    const scenario = sc.scenario ?? sc.label;
    const metas = owned(scenario, "metadata");
    const comms = owned(scenario, "customer_communication");
    const ais = owned(scenario, "ai_evaluation");
    if (metas.length === 0 && comms.length === 0 && ais.length === 0) continue;

    const sid = slug(scenario);
    let onYes: string;

    if (ais.length > 0) {
      // Layer 2 = intent check → Layer 3 = info shared.
      const l2 = `${sid}_intent_check`;
      const l3 = `${sid}_info_shared`;
      layer2.push(
        momentBlock(
          l2,
          `${name} scenarios > ${scenario}`,
          "Intent matches scenario?",
          intentPrompt(ais[0]),
          `layer_3.${l3}`
        )
      );
      layer3.push(
        momentBlock(
          l3,
          `${l2} > Yes`,
          "Agent shared required info?",
          infoPrompt(scenario, comms),
          "response.YES"
        )
      );
      onYes = `layer_2.${l2}`;
    } else {
      // Layer 2 = info shared directly → response.YES.
      const l2 = `${sid}_info_shared`;
      layer2.push(
        momentBlock(
          l2,
          `${name} scenarios > ${scenario}`,
          "Agent shared required info?",
          infoPrompt(scenario, comms),
          "response.YES"
        )
      );
      onYes = `layer_2.${l2}`;
    }

    layer1Branches.push({
      name: scenario,
      gear: metadataGear(metas),
      on_yes: onYes,
      on_else: "response.NO",
    });
  }

  layer1Branches.push({ name: "Else Path", connect_to: "response.NO" });

  return {
    rules: BUILD_SPEC_RULES,
    layer_0: {
      created_by: "Click + -> Conditional block",
      block_name: "SOPs",
      branches: [
        {
          name,
          gear: {
            type: "Single block",
            condition: "Attribute",
            attribute_category: "Tags",
            key: name,
          },
          on_yes: `layer_1.${layer1Id}`,
          on_else: "response.NO",
        },
        { name: "Else Path", connect_to: "response.NO" },
      ],
    },
    layer_1: {
      id: layer1Id,
      created_by: "Hover right of branch -> + -> Conditional block",
      parent_branch: `SOPs > ${name}`,
      block_name: `${name} scenarios`,
      branches: layer1Branches,
    },
    layer_2: layer2,
    layer_3: layer3,
    response: {
      created_by: "Click + -> Response block (create once, reuse for all SOPs)",
      YES: "YES",
      NO: "NO",
    },
  };
}
