/**
 * Rule set export (Sprint 9) — ported from `services/export.py`.
 *
 * Serializes a rule set to downloadable formats: Rule Engine JSON (primary)
 * and a human-readable summary.
 */

import type { RuleSet } from "@/lib/types";
import { toEngineJson } from "@/server/rules-engine";

export function exportJson(ruleSet: RuleSet): string {
  return JSON.stringify(toEngineJson(ruleSet), null, 2);
}

export function exportSummary(ruleSet: RuleSet): string {
  const lines: string[] = [
    `# ${ruleSet.name} (v${ruleSet.version})`,
    `Rules: ${ruleSet.rules.length}`,
    "",
  ];
  for (const rule of ruleSet.rules) {
    const state = rule.enabled ? "on" : "off";
    lines.push(`- [${state}] ${rule.name} (priority ${rule.priority})`);
    for (const cond of rule.all) {
      lines.push(`    when ${cond.fact} ${cond.operator} ${cond.value}`);
    }
    for (const action of rule.actions) {
      const value = action.value === undefined ? "" : ` = ${action.value}`;
      lines.push(`    then ${action.type} ${action.target}${value}`);
    }
  }
  return lines.join("\n");
}
