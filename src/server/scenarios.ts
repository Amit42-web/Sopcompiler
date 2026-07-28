/**
 * Scenario extraction and resolution grouping (Sprint 5) — ported from
 * `services/scenarios.py`.
 *
 * A "scenario" is a condition → resolution pair extracted from SOP prose,
 * detected with conditional-language heuristics (if/when/should/in case of).
 * Resolutions are bucketed into groups by the action verb used.
 */

import type { Scenario, SopSection } from "@/lib/types";
import { newId } from "@/server/id";

const PATTERNS: RegExp[] = [
  /\bif\b(?<cond>.+?)\bthen\b(?<res>.+)/i,
  /\bwhen\b(?<cond>.+?)[,:](?<res>.+)/i,
  /\bin (?:the )?(?:case|event) (?:of|that)\b(?<cond>.+?)[,:](?<res>.+)/i,
  /(?<cond>.+?)\b(?:should|must|shall)\b(?<res>.+)/i,
];

const RESOLUTION_GROUPS: [string, string[]][] = [
  ["Auto-approve", ["approve", "grant", "allow", "authorize", "accept"]],
  ["Deny", ["deny", "reject", "decline", "block", "refuse"]],
  ["Escalate", ["escalate", "route", "forward", "refer", "review by"]],
  ["Notify", ["notify", "inform", "email", "alert", "contact"]],
  ["Record", ["log", "record", "document", "flag", "note"]],
];

function clean(text: string): string {
  return text.replace(/\s+/g, " ").replace(/^[\s.,:;-]+|[\s.,:;-]+$/g, "");
}

export function classifyResolution(resolution: string): string {
  const lowered = resolution.toLowerCase();
  for (const [group, keywords] of RESOLUTION_GROUPS) {
    if (keywords.some((kw) => lowered.includes(kw))) return group;
  }
  return "Other";
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+|(?:^|\s)[-•*]\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);
}

/** Normalized key used to detect duplicate scenarios. */
function dedupeKey(condition: string, resolution: string): string {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  return `${norm(condition)}=>${norm(resolution)}`;
}

export function extractScenarios(sections: SopSection[]): Scenario[] {
  const scenarios: Scenario[] = [];
  const seen = new Set<string>();

  for (const section of sections) {
    for (const sentence of splitSentences(section.text)) {
      for (let i = 0; i < PATTERNS.length; i++) {
        const match = PATTERNS[i].exec(sentence);
        if (!match?.groups) continue;

        const condition = clean(match.groups.cond);
        const resolution = clean(match.groups.res);
        if (condition.length < 3 || resolution.length < 3) continue;

        // Skip a scenario we've already captured (same condition + resolution).
        const key = dedupeKey(condition, resolution);
        if (seen.has(key)) break;
        seen.add(key);

        const group = classifyResolution(resolution);
        let confidence = i === 0 ? 0.9 : 0.7;
        if (group === "Other") confidence -= 0.15;

        scenarios.push({
          id: newId("scn"),
          section_id: section.id,
          condition,
          resolution,
          resolution_group: group,
          confidence: Math.round(confidence * 100) / 100,
        });
        break; // first matching pattern wins for this sentence
      }
    }
  }

  return scenarios;
}

/** Group scenarios by their resolution group (Sprint 5 grouping output). */
export function groupByResolution(
  scenarios: Scenario[]
): Record<string, Scenario[]> {
  const grouped: Record<string, Scenario[]> = {};
  for (const scenario of scenarios) {
    (grouped[scenario.resolution_group] ??= []).push(scenario);
  }
  return grouped;
}
