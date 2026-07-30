/**
 * Optional LLM enhancer — ported from `services/llm.py`.
 *
 * The pipeline is fully functional on heuristics alone. When `ANTHROPIC_API_KEY`
 * is set, `enhanceScenarios` refines the extracted scenarios via the Anthropic
 * Messages API (called with plain `fetch`, no SDK dependency). Any failure
 * (missing key, offline, rate limit, bad JSON) returns the input unchanged, so
 * the pipeline never hard-depends on the network.
 */

import type {
  RuleEngineTree,
  Scenario,
  SopSection,
  StructuredRule,
} from "@/lib/types";

export function isAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const RULE_ENGINE_KB = `You are an expert Rule Engine Designer converting SOPs into an executable decision tree (NOT a summary).
The Rule Engine evaluates blocks top-to-bottom; each decision routes on YES / NO / NA until a Response block.
Block types:
- attribute: read call metadata (Order Status, Delivery Partner, SSI, Product Category, Promise Date, Brand, Product Price, Call Date, etc.). Use when metadata alone decides the outcome.
- condition: evaluate ONE attribute (one logical decision only; never combine with AND). YES/NO/NA routing.
- validate_info: verify the agent communicated a mandatory FACT (e.g. informed expected delivery date, shared revised timeline, explained tracking steps).
- prompt: AI judgement of transcript QUALITY (e.g. did the agent educate correctly / provide complete resolution / verify the concern). Use only when transcript understanding is required.
- moment: restrict to a call stage (Opening/Diagnosis/Resolution/Closing) only if the SOP requires it.
- response: terminal outcome (SOP Followed / SOP Not Followed / NA).
Rules: start with applicability (if it doesn't apply → NA). Extract every metadata decision as attribute+condition. Convert mandatory communications to validate_info, subjective judgement to prompt. Prefer metadata over prompts. Split multiple SOP scenarios into separate branches; never merge them; never invent steps; don't include internal tool navigation unless the SOP requires validating it. Every branch MUST end in a response. Output execution order, not SOP order.
Respond with ONLY JSON: {"name":string,"version":"1.0.0","root":blockId,"blocks":[{"id","type","label","attribute?","operator?","value?","prompt?","moment?","response?","yes?","no?","na?","next?"}]}. Routing fields ("yes"/"no"/"na"/"next") are block ids or null. Ensure every routed id exists.`;

/** Build the Rule Engine decision tree directly from the SOP via the LLM. */
export async function buildRuleEngineTree(
  name: string,
  sections: SopSection[]
): Promise<RuleEngineTree | null> {
  if (!isAvailable() || sections.length === 0) return null;
  try {
    const model = process.env.LLM_MODEL || "claude-sonnet-5";
    const sop = sections.map((s) => `## ${s.title}\n${s.text}`).join("\n\n");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY as string,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 8192,
        system: RULE_ENGINE_KB,
        messages: [
          { role: "user", content: `SOP name: ${name}\n\nSOP:\n${sop}` },
        ],
      }),
    });
    if (!res.ok) return null;
    const payload = await res.json();
    const text = payload?.content?.[0]?.text ?? "";
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const tree = JSON.parse(json) as RuleEngineTree;
    if (!tree || !Array.isArray(tree.blocks) || tree.blocks.length === 0)
      return null;
    return tree;
  } catch {
    return null;
  }
}

const EXTRACTION_SPEC = `You convert Standard Operating Procedures (SOPs) into Rule Engine-ready rules.
Rules you MUST follow:
- Preserve the parent scenario for every rule (applies_to); never output standalone statements.
- Extract complete IF/ELSE decision trees; do not skip any branch. Capture exception handling and alternate flows as separate branches (branch: main | exception | alternate).
- Separate categories: business_rule, agent_obligation, backend_action, metadata_condition.
- Retain all preconditions per rule. Preserve nested AND/OR/IF conditions exactly as written (conditions is a nested tree of {type:"group",op:"all"|"any",children:[...]} and {type:"leaf",raw,fact,operator,value}).
- Remove duplicate rules: when identical logic recurs, output ONE rule and list every scenario under applies_to (reusable), never duplicates.
- Keep original business logic intact; never summarize or simplify decision paths. Maintain execution sequence via the order field.
- action_kind is agent_action, backend_action, or business_rule. Set validation_prompt ("Did the agent ...?") ONLY for transcript-verifiable agent_action rules; it must be null for backend/system actions.
- obligation is mandatory or conditional.
- Omit no business rule, exception, note, or edge case.
Respond with ONLY a JSON array of rules with keys: id, reusable_key, name, category, action_kind, obligation, branch, order, preconditions (string[]), conditions (node|null), action ({type,target,value?}), validation_prompt (string|null), applies_to ([{scenario, preconditions:string[]}]), raw.`;

function looksValid(r: unknown): r is StructuredRule {
  const x = r as Record<string, unknown>;
  return (
    !!x &&
    typeof x.name === "string" &&
    typeof x.category === "string" &&
    Array.isArray(x.applies_to)
  );
}

/**
 * Full-fidelity structured extraction via the LLM. Returns null when the
 * enhancer is unavailable or the response can't be parsed, so callers fall
 * back to the deterministic extractor.
 */
export async function extractStructured(
  sections: SopSection[]
): Promise<StructuredRule[] | null> {
  if (!isAvailable() || sections.length === 0) return null;
  try {
    const model = process.env.LLM_MODEL || "claude-sonnet-5";
    const sop = sections
      .map((s) => `## ${s.title}\n${s.text}`)
      .join("\n\n");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY as string,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 8192,
        system: EXTRACTION_SPEC,
        messages: [{ role: "user", content: `SOP:\n${sop}` }],
      }),
    });
    if (!res.ok) return null;
    const payload = await res.json();
    const text = payload?.content?.[0]?.text ?? "";
    const json = text.slice(text.indexOf("["), text.lastIndexOf("]") + 1);
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed) || !parsed.every(looksValid)) return null;
    return parsed as StructuredRule[];
  } catch {
    return null;
  }
}

export async function enhanceScenarios(
  scenarios: Scenario[]
): Promise<Scenario[]> {
  if (!isAvailable() || scenarios.length === 0) return scenarios;

  try {
    const model = process.env.LLM_MODEL || "claude-sonnet-5";
    const prompt =
      "You are refining rule scenarios extracted from a Standard Operating " +
      "Procedure. For each scenario, rewrite the condition and resolution to " +
      "be concise and unambiguous. Respond with ONLY a JSON array of objects " +
      "with keys id, condition, resolution.\n\nScenarios:\n" +
      JSON.stringify(scenarios);

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY as string,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return scenarios;

    const payload = await res.json();
    const textBlock = payload?.content?.[0]?.text ?? "[]";
    const refinements: { id: string; condition?: string; resolution?: string }[] =
      JSON.parse(textBlock);
    const byId = new Map(refinements.map((r) => [r.id, r]));

    return scenarios.map((s) => {
      const ref = byId.get(s.id);
      if (!ref) return s;
      return {
        ...s,
        condition: ref.condition ?? s.condition,
        resolution: ref.resolution ?? s.resolution,
        confidence: Math.min(1, s.confidence + 0.05),
      };
    });
  } catch {
    return scenarios;
  }
}
