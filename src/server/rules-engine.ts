/**
 * Rule Engine JSON generation (Sprint 7) — ported from `services/rules_engine.py`.
 *
 * Turns extracted scenarios into structured Rule objects: the condition clause
 * is parsed into a typed fact/operator/value, and the resolution group maps to
 * a canonical action. `toEngineJson` renders a RuleSet into portable Rule
 * Engine JSON (a `conditions.all` array + an `event`).
 */

import type {
  PipelineResult,
  Rule,
  RuleAction,
  RuleCondition,
  RuleOperator,
  RuleSet,
  Scenario,
} from "@/lib/types";
import { newId, nowIso } from "@/server/id";

const COMPARATORS: [RegExp, RuleOperator][] = [
  [/\b(?:greater than or equal|at least|no less than)\b/i, "greater_than"],
  [/\b(?:less than or equal|at most|no more than|within)\b/i, "less_than"],
  [/\b(?:greater than|more than|older than|longer than|over|above|exceeds?)\b/i, "greater_than"],
  [/\b(?:less than|fewer than|younger than|newer than|sooner than|under|below)\b/i, "less_than"],
  [/\b(?:is not|are not|isn't|aren't|not equal)\b/i, "not_equals"],
  [/\b(?:contains?|includes?|has)\b/i, "contains"],
  [/\b(?:is|are|equals?|equal to)\b/i, "equals"],
];

const NUMBER = /(-?\d+(?:\.\d+)?)/;
const FACT_STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "is",
  "are",
  "of",
  "and",
  "or",
  "customer",
]);

const GROUP_ACTIONS: Record<string, RuleAction> = {
  "Auto-approve": { type: "set", target: "status", value: "approved" },
  Deny: { type: "set", target: "status", value: "denied" },
  Escalate: { type: "route", target: "queue", value: "manual_review" },
  Notify: { type: "notify", target: "stakeholder" },
  Record: { type: "log", target: "audit_trail" },
};

function slugifyFact(text: string): string {
  const words = (text.toLowerCase().match(/[a-z]+/g) ?? []).filter(
    (w) => !FACT_STOPWORDS.has(w)
  );
  return words.slice(0, 4).join("_") || "condition";
}

function parseCondition(condition: string): RuleCondition {
  let operator: RuleOperator = "equals";
  for (const [pattern, op] of COMPARATORS) {
    if (pattern.test(condition)) {
      operator = op;
      break;
    }
  }

  const number = NUMBER.exec(condition);
  if (number && (operator === "greater_than" || operator === "less_than")) {
    const parsed = Number(number[1]);
    const value = Number.isInteger(parsed) ? parsed : parsed;
    const fact = slugifyFact(condition.replace(NUMBER, ""));
    return { fact, operator, value };
  }

  const tokens = condition.match(/[a-zA-Z]+/g) ?? [];
  const value = tokens.length > 0 ? tokens[tokens.length - 1] : "true";
  return { fact: slugifyFact(condition), operator, value };
}

export function scenarioToRule(scenario: Scenario, priority: number): Rule {
  const condition = parseCondition(scenario.condition);
  const action = GROUP_ACTIONS[scenario.resolution_group] ?? {
    type: "set",
    target: "outcome",
    value: "review",
  };
  return {
    id: newId("rul"),
    name: scenario.resolution.slice(0, 80) || "Generated rule",
    description: `${scenario.condition} → ${scenario.resolution}`,
    priority,
    all: [condition],
    actions: [action],
    enabled: scenario.confidence >= 0.6,
    source_scenario_id: scenario.id,
  };
}

export function generateRuleSet(
  projectId: string,
  results: PipelineResult[]
): RuleSet {
  const rules: Rule[] = [];
  let priority = 10;
  for (const result of results) {
    for (const scenario of result.scenarios) {
      rules.push(scenarioToRule(scenario, priority));
      priority += 10;
    }
  }

  return {
    id: newId("rst"),
    project_id: projectId,
    name: "Generated rule set",
    version: "1.0.0",
    rules,
    created_at: nowIso(),
  };
}

export function toEngineJson(ruleSet: RuleSet): unknown {
  return {
    name: ruleSet.name,
    version: ruleSet.version,
    rules: ruleSet.rules
      .filter((rule) => rule.enabled)
      .map((rule) => ({
        id: rule.id,
        name: rule.name,
        priority: rule.priority,
        conditions: {
          all: rule.all.map((c) => ({
            fact: c.fact,
            operator: c.operator,
            value: c.value,
          })),
        },
        event: {
          type: "ruleforge.match",
          params: {
            actions: rule.actions.map((a) =>
              a.value === undefined
                ? { type: a.type, target: a.target }
                : { type: a.type, target: a.target, value: a.value }
            ),
          },
        },
      })),
  };
}
