/**
 * Optional LLM enhancer — ported from `services/llm.py`.
 *
 * The pipeline is fully functional on heuristics alone. When `ANTHROPIC_API_KEY`
 * is set, `enhanceScenarios` refines the extracted scenarios via the Anthropic
 * Messages API (called with plain `fetch`, no SDK dependency). Any failure
 * (missing key, offline, rate limit, bad JSON) returns the input unchanged, so
 * the pipeline never hard-depends on the network.
 */

import type { Scenario } from "@/lib/types";

export function isAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
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
