/**
 * Structured SOP extraction (decision-tree, categorized).
 *
 * Converts SOP prose into Rule Engine–ready `StructuredRule`s that:
 *   - preserve the parent scenario for every rule (never standalone),
 *   - keep IF/ELSE branches and nested AND/OR conditions with exact wording,
 *   - separate metadata conditions, agent obligations, backend actions, and
 *     business rules,
 *   - retain preconditions and mark mandatory vs conditional obligations,
 *   - emit transcript-validation prompts only for agent actions (never backend),
 *   - de-duplicate identical logic into reusable rules bound to each scenario.
 *
 * This is a deterministic approximation; when `ANTHROPIC_API_KEY` is set,
 * `llm.ts` performs the full-fidelity extraction with the same output shape.
 */

import type {
  ActionKind,
  BranchKind,
  ConditionNode,
  ExtractionResult,
  MetadataCondition,
  Obligation,
  RuleAction,
  RuleCategory,
  RuleOperator,
  SopSection,
  StructuredRule,
} from "@/lib/types";
import { newId } from "@/server/id";

// --- Vocabulary ------------------------------------------------------------

const AGENT_VERBS = [
  "ask", "confirm", "verify", "greet", "inform", "tell", "say", "mention",
  "offer", "disclose", "state", "apologize", "apologise", "acknowledge",
  "read", "explain", "probe", "request", "collect", "capture", "repeat",
  "reassure", "thank", "clarify", "advise", "remind", "welcome", "notify",
];

const BACKEND_VERBS = [
  "update", "log", "create", "trigger", "sync", "store", "record", "flag",
  "tag", "mark", "generate", "route", "raise", "queue", "persist", "set",
];

const MANDATORY = /\b(must|shall|mandatory|required|always|ensure|never|do not|don't)\b/i;
const CONDITIONAL = /\b(should|may|can|optional|recommended|if applicable|where possible|when appropriate|as needed|try to)\b/i;

const EXCEPTION_MARKERS = /\b(exception|if not|if unable|if the customer refuses|in case of (?:failure|error)|if none|if this fails|on failure|escalat)/i;
const ALTERNATE_MARKERS = /\b(alternatively|on the other hand)\b/i;

const NUMBER = /(-?\d+(?:\.\d+)?)/;
const FACT_STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "of", "and", "or", "customer", "to", "be",
  "has", "have", "was", "were", "that", "this", "their", "for", "with",
]);

// --- Condition parsing (nested, exact) -------------------------------------

const COMPARATORS: [RegExp, RuleOperator][] = [
  [/\b(?:greater than or equal|at least|no less than)\b/i, "greater_than"],
  [/\b(?:less than or equal|at most|no more than|within)\b/i, "less_than"],
  [/\b(?:greater than|more than|older than|longer than|over|above|exceeds?)\b/i, "greater_than"],
  [/\b(?:less than|fewer than|younger than|newer than|under|below)\b/i, "less_than"],
  [/\b(?:is not|are not|isn't|aren't|not equal|other than)\b/i, "not_equals"],
  [/\b(?:contains?|includes?|has|mentions?)\b/i, "contains"],
  [/\b(?:is one of|in the list|any of)\b/i, "in"],
  [/\b(?:is|are|equals?|equal to|matches)\b/i, "equals"],
];

function slugifyFact(text: string): string {
  const words = (text.toLowerCase().match(/[a-z]+/g) ?? []).filter(
    (w) => !FACT_STOPWORDS.has(w)
  );
  return words.slice(0, 5).join("_") || "condition";
}

function parseLeaf(raw: string): ConditionNode {
  const text = raw.trim();
  let operator: RuleOperator = "equals";
  for (const [re, op] of COMPARATORS) {
    if (re.test(text)) {
      operator = op;
      break;
    }
  }
  const num = NUMBER.exec(text);
  let value: string | number | boolean;
  let factSource = text;
  if (num && (operator === "greater_than" || operator === "less_than")) {
    const parsed = Number(num[1]);
    value = parsed;
    factSource = text.replace(NUMBER, "");
  } else {
    const tokens = text.match(/[a-zA-Z]+/g) ?? [];
    value = tokens.length ? tokens[tokens.length - 1] : true;
  }
  return { type: "leaf", raw: text, fact: slugifyFact(factSource), operator, value };
}

/** Split a string on a connector at the top level (respecting parentheses). */
function splitTopLevel(text: string, connector: RegExp): string[] {
  const parts: string[] = [];
  let depth = 0;
  let buf = "";
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "(") depth++;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if (depth === 0) {
      const rest = text.slice(i);
      const m = rest.match(connector);
      if (m && m.index === 0) {
        parts.push(buf);
        buf = "";
        i += m[0].length;
        continue;
      }
    }
    buf += ch;
    i++;
  }
  parts.push(buf);
  return parts.map((p) => p.trim()).filter(Boolean);
}

/** Build a nested condition tree, keeping exact wording. AND binds tighter. */
function parseConditions(text: string): ConditionNode | null {
  const clean = text.trim().replace(/^\(|\)$/g, "").trim();
  if (!clean) return null;

  const orParts = splitTopLevel(clean, /^\s*\bor\b\s*/i);
  const orChildren = orParts.map((orPart) => {
    const andParts = splitTopLevel(orPart, /^\s*(?:\band\b|,)\s*/i);
    const andChildren = andParts.map(parseLeaf);
    return andChildren.length === 1
      ? andChildren[0]
      : ({ type: "group", op: "all", children: andChildren } as ConditionNode);
  });
  return orChildren.length === 1
    ? orChildren[0]
    : { type: "group", op: "any", children: orChildren };
}

// --- Classification --------------------------------------------------------

function firstVerb(text: string): string | null {
  const words = text.toLowerCase().match(/[a-z']+/g) ?? [];
  for (const w of words) {
    if (AGENT_VERBS.includes(w) || BACKEND_VERBS.includes(w)) return w;
  }
  return null;
}

function classify(action: string): { kind: ActionKind; category: RuleCategory } {
  const lower = action.toLowerCase();
  const backendSubject = /\b(system|backend|crm|database|db|api|platform)\b/.test(lower);
  const verb = firstVerb(lower);

  if (backendSubject || (verb && BACKEND_VERBS.includes(verb) && !AGENT_VERBS.includes(verb))) {
    return { kind: "backend_action", category: "backend_action" };
  }
  if (verb && AGENT_VERBS.includes(verb)) {
    return { kind: "agent_action", category: "agent_obligation" };
  }
  return { kind: "business_rule", category: "business_rule" };
}

function obligationOf(text: string): Obligation {
  if (CONDITIONAL.test(text) && !MANDATORY.test(text)) return "conditional";
  if (MANDATORY.test(text)) return "mandatory";
  return "conditional";
}

function branchOf(text: string, sectionTitle: string): BranchKind {
  if (EXCEPTION_MARKERS.test(text) || EXCEPTION_MARKERS.test(sectionTitle))
    return "exception";
  if (ALTERNATE_MARKERS.test(text)) return "alternate";
  return "main";
}

/** Build a transcript-validation prompt — only meaningful for agent actions. */
function validationPrompt(action: string, kind: ActionKind): string | null {
  if (kind !== "agent_action") return null;
  const phrase = action
    .replace(/^(the )?agent (must|should|shall|will|needs to|has to)\s+/i, "")
    .replace(/^(please\s+)/i, "")
    .trim()
    .replace(/[.?!]+$/, "");
  const normalized = phrase.charAt(0).toLowerCase() + phrase.slice(1);
  return `Did the agent ${normalized}?`;
}

// --- Statement splitting ---------------------------------------------------

function splitStatements(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+|(?:^|\s)[-•*]\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);
}

const IF_THEN = /\bif\b(?<cond>.+?)(?:\bthen\b|,)\s*(?<rest>.+)/i;
const ELSE_SPLIT = /\b(?:else|otherwise)\b[,: ]*/i;
const IMPERATIVE = /\b(?:the )?agent\b|\bmust\b|\bshould\b|\bshall\b|\bensure\b|\bnever\b|\bdo not\b/i;

interface RawRule {
  scenario: string;
  preconditions: string[];
  conditionText: string | null;
  action: string;
  branch: BranchKind;
  order: number;
}

function extractFromStatement(
  statement: string,
  scenario: string,
  preconditions: string[],
  order: number
): RawRule[] {
  const out: RawRule[] = [];
  const branch = branchOf(statement, scenario);

  const m = IF_THEN.exec(statement);
  if (m?.groups) {
    const cond = m.groups.cond.trim();
    const rest = m.groups.rest.trim();
    const [thenAction, elseAction] = rest.split(ELSE_SPLIT);
    if (thenAction && thenAction.trim().length > 2) {
      out.push({
        scenario,
        preconditions,
        conditionText: cond,
        action: thenAction.trim(),
        branch,
        order,
      });
    }
    if (elseAction && elseAction.trim().length > 2) {
      // The else branch is an alternate flow with the negated condition.
      out.push({
        scenario,
        preconditions,
        conditionText: `not (${cond})`,
        action: elseAction.trim(),
        branch: "alternate",
        order: order + 0.5,
      });
    }
    return out;
  }

  // Imperative obligation / backend action with no explicit condition.
  if (IMPERATIVE.test(statement) || firstVerb(statement)) {
    out.push({
      scenario,
      preconditions,
      conditionText: null,
      action: statement,
      branch,
      order,
    });
  }
  return out;
}

// --- Metadata → condition nodes -------------------------------------------

const METADATA_FIELDS = [
  "order age", "order value", "amount", "customer type", "plan", "tenure",
  "status", "priority", "region", "channel", "language", "product", "tier",
  "refund", "balance", "account age", "sentiment", "call reason", "department",
];

function metadataConditions(text: string): MetadataCondition[] {
  const lower = text.toLowerCase();
  const found: MetadataCondition[] = [];
  const seen = new Set<string>();
  for (const field of METADATA_FIELDS) {
    if (lower.includes(field) && !seen.has(field)) {
      seen.add(field);
      found.push({
        field: field.replace(/\s+/g, "_"),
        operator: "equals",
        value: "<value>",
        raw: field,
      });
    }
  }
  return found;
}

// --- Reusable de-duplication ----------------------------------------------

function conditionKey(node: ConditionNode | null): string {
  if (!node) return "∅";
  if (node.type === "leaf")
    return node.raw.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return `${node.op}(${node.children.map(conditionKey).join(",")})`;
}

function actionKey(action: RuleAction): string {
  return `${action.type}:${action.target}`.toLowerCase();
}

function ruleName(action: string): string {
  const s = action.replace(/^(the )?agent (must|should|shall|will)\s+/i, "").trim();
  return (s.charAt(0).toUpperCase() + s.slice(1)).slice(0, 80);
}

function actionFor(rawAction: string, kind: ActionKind): RuleAction {
  const verb = firstVerb(rawAction) ?? (kind === "agent_action" ? "prompt" : "execute");
  const target = slugifyFact(rawAction.replace(new RegExp(`\\b${verb}\\b`, "i"), ""));
  return { type: verb, target };
}

// --- Public API ------------------------------------------------------------

export function extractRules(sections: SopSection[]): ExtractionResult {
  const byKey = new Map<string, StructuredRule>();
  let order = 0;
  let scenariosConverted = 0;
  const allMetadata: MetadataCondition[] = [];
  const metaSeen = new Set<string>();

  for (const section of sections) {
    const scenario = section.title;
    let producedForScenario = 0;
    const preconditions: string[] = [];

    for (const mc of metadataConditions(section.text)) {
      if (!metaSeen.has(mc.field)) {
        metaSeen.add(mc.field);
        allMetadata.push(mc);
      }
    }

    for (const statement of splitStatements(section.text)) {
      // "Only if / provided that" lines act as preconditions for what follows.
      const pre = /^(only if|provided that|prerequisite|precondition)[:,]?\s*(.+)/i.exec(
        statement
      );
      if (pre) {
        preconditions.push(pre[2].trim());
        continue;
      }

      const raws = extractFromStatement(statement, scenario, [...preconditions], order);
      order += 1;

      for (const raw of raws) {
        const { kind, category } = classify(raw.action);
        const conditions = raw.conditionText
          ? parseConditions(raw.conditionText)
          : null;
        const action = actionFor(raw.action, kind);
        const key = `${category}|${actionKey(action)}|${conditionKey(conditions)}`;

        const binding = { scenario: raw.scenario, preconditions: raw.preconditions };

        const existing = byKey.get(key);
        if (existing) {
          // Reusable: bind the same rule to another scenario instead of
          // duplicating it.
          if (
            !existing.applies_to.some(
              (b) => b.scenario === binding.scenario
            )
          ) {
            existing.applies_to.push(binding);
          }
          producedForScenario += 1;
          continue;
        }

        byKey.set(key, {
          id: newId("rule"),
          reusable_key: key,
          name: ruleName(raw.action),
          category,
          action_kind: kind,
          obligation: obligationOf(raw.action),
          branch: raw.branch,
          order: raw.order,
          preconditions: raw.preconditions,
          conditions,
          action,
          validation_prompt: validationPrompt(raw.action, kind),
          applies_to: [binding],
          raw: statement,
        });
        producedForScenario += 1;
      }
    }

    if (producedForScenario > 0) scenariosConverted += 1;
  }

  const rules = [...byKey.values()].sort((a, b) => a.order - b.order);
  return {
    rules,
    metadata_conditions: allMetadata,
    scenarios_total: sections.length,
    scenarios_converted: scenariosConverted,
    complete: scenariosConverted === sections.length,
  };
}
