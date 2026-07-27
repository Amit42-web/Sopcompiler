/**
 * Rule set validation (Sprint 9) — ported from `services/validation.py`.
 *
 * Checks a generated rule set for structural problems before export:
 *   - empty names / missing actions (errors)
 *   - duplicate names, contradictory conditions, unconditional rules (warnings)
 *   - empty rule sets (info)
 */

import type { Rule, RuleSet, ValidationIssue, ValidationReport } from "@/lib/types";

function contradicts(rule: Rule): boolean {
  const seen = new Map<string, Rule["all"][number]["value"]>();
  for (const cond of rule.all) {
    if (cond.operator === "equals") {
      if (seen.has(cond.fact) && seen.get(cond.fact) !== cond.value) return true;
      seen.set(cond.fact, cond.value);
    }
  }
  return false;
}

export function validateRuleSet(ruleSet: RuleSet): ValidationReport {
  const issues: ValidationIssue[] = [];
  const seenNames = new Set<string>();

  for (const rule of ruleSet.rules) {
    if (!rule.name.trim()) {
      issues.push({
        rule_id: rule.id,
        severity: "error",
        code: "EMPTY_NAME",
        message: "Rule has no name.",
      });
    }
    if (seenNames.has(rule.name)) {
      issues.push({
        rule_id: rule.id,
        severity: "warning",
        code: "DUPLICATE_NAME",
        message: `Duplicate rule name: "${rule.name}".`,
      });
    }
    seenNames.add(rule.name);

    if (rule.enabled && rule.actions.length === 0) {
      issues.push({
        rule_id: rule.id,
        severity: "error",
        code: "NO_ACTIONS",
        message: "Enabled rule has no actions.",
      });
    }
    if (rule.enabled && rule.all.length === 0) {
      issues.push({
        rule_id: rule.id,
        severity: "warning",
        code: "NO_CONDITIONS",
        message: "Enabled rule has no conditions and always matches.",
      });
    }
    if (contradicts(rule)) {
      issues.push({
        rule_id: rule.id,
        severity: "warning",
        code: "CONTRADICTORY_CONDITIONS",
        message: "Rule requires one fact to equal two values.",
      });
    }
  }

  if (!ruleSet.rules.some((r) => r.enabled)) {
    issues.push({
      severity: "info",
      code: "NO_ENABLED_RULES",
      message: "No rules are enabled — the export will be empty.",
    });
  }

  const hasError = issues.some((i) => i.severity === "error");
  return {
    valid: !hasError,
    issues,
    checked_rules: ruleSet.rules.length,
  };
}
