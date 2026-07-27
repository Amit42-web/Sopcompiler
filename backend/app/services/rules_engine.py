"""Rule Engine JSON generation (Sprint 7).

Turns extracted scenarios into structured :class:`Rule` objects. Each scenario
becomes one rule: the condition clause is parsed into typed facts/operators,
and the resolution group maps to a canonical action.

``to_engine_json`` renders a :class:`RuleSet` into the portable JSON shape
consumed by common rule engines (a ``conditions.all`` array + an ``event``).
"""

from __future__ import annotations

import re

from app.models.schemas import (
    PipelineResult,
    Rule,
    RuleAction,
    RuleCondition,
    RuleOperator,
    RuleSet,
    Scenario,
)
from app.services.storage import new_id

# Comparison phrases → operators. Order matters (longest/﻿specific first).
_COMPARATORS: list[tuple[re.Pattern[str], RuleOperator]] = [
    (re.compile(r"\b(?:greater than or equal|at least|no less than)\b"), RuleOperator.greater_than),
    (re.compile(r"\b(?:less than or equal|at most|no more than|within)\b"), RuleOperator.less_than),
    (re.compile(r"\b(?:greater than|more than|over|above|exceeds?)\b"), RuleOperator.greater_than),
    (re.compile(r"\b(?:less than|fewer than|under|below)\b"), RuleOperator.less_than),
    (re.compile(r"\b(?:is not|are not|isn't|aren't|not equal)\b"), RuleOperator.not_equals),
    (re.compile(r"\b(?:contains?|includes?|has)\b"), RuleOperator.contains),
    (re.compile(r"\b(?:is|are|equals?|equal to)\b"), RuleOperator.equals),
]

_NUMBER = re.compile(r"(-?\d+(?:\.\d+)?)")
_FACT_STOPWORDS = {"the", "a", "an", "is", "are", "of", "and", "or", "customer"}

_GROUP_ACTIONS: dict[str, RuleAction] = {
    "Auto-approve": RuleAction(type="set", target="status", value="approved"),
    "Deny": RuleAction(type="set", target="status", value="denied"),
    "Escalate": RuleAction(type="route", target="queue", value="manual_review"),
    "Notify": RuleAction(type="notify", target="stakeholder"),
    "Record": RuleAction(type="log", target="audit_trail"),
}


def _slugify_fact(text: str) -> str:
    words = [
        w
        for w in re.findall(r"[a-zA-Z]+", text.lower())
        if w not in _FACT_STOPWORDS
    ]
    return "_".join(words[:4]) or "condition"


def _parse_condition(condition: str) -> RuleCondition:
    """Best-effort parse of a natural-language condition into a typed fact."""
    operator = RuleOperator.equals
    for pattern, op in _COMPARATORS:
        if pattern.search(condition):
            operator = op
            break

    number = _NUMBER.search(condition)
    if number and operator in {
        RuleOperator.greater_than,
        RuleOperator.less_than,
    }:
        value: object = float(number.group(1))
        if float(value).is_integer():
            value = int(value)
        fact = _slugify_fact(_NUMBER.sub("", condition))
    else:
        # Use trailing noun-ish token as the value for equality checks.
        tokens = re.findall(r"[a-zA-Z]+", condition)
        value = tokens[-1] if tokens else "true"
        fact = _slugify_fact(condition)

    return RuleCondition(fact=fact, operator=operator, value=value)


def scenario_to_rule(scenario: Scenario, priority: int) -> Rule:
    condition = _parse_condition(scenario.condition)
    action = _GROUP_ACTIONS.get(
        scenario.resolution_group,
        RuleAction(type="set", target="outcome", value="review"),
    )
    return Rule(
        id=new_id("rul"),
        name=scenario.resolution[:80] or "Generated rule",
        description=f"{scenario.condition} → {scenario.resolution}",
        priority=priority,
        all=[condition],
        actions=[action],
        enabled=scenario.confidence >= 0.6,
        source_scenario_id=scenario.id,
    )


def generate_rule_set(project_id: str, results: list[PipelineResult]) -> RuleSet:
    rules: list[Rule] = []
    priority = 10
    for result in results:
        for scenario in result.scenarios:
            rules.append(scenario_to_rule(scenario, priority))
            priority += 10

    return RuleSet(
        id=new_id("rst"),
        project_id=project_id,
        name="Generated rule set",
        version="1.0.0",
        rules=rules,
    )


def to_engine_json(rule_set: RuleSet) -> dict:
    """Render a rule set into portable Rule Engine JSON."""
    return {
        "name": rule_set.name,
        "version": rule_set.version,
        "rules": [
            {
                "id": rule.id,
                "name": rule.name,
                "priority": rule.priority,
                "conditions": {
                    "all": [
                        {
                            "fact": c.fact,
                            "operator": c.operator.value,
                            "value": c.value,
                        }
                        for c in rule.all
                    ]
                },
                "event": {
                    "type": "ruleforge.match",
                    "params": {
                        "actions": [a.model_dump(exclude_none=True) for a in rule.actions]
                    },
                },
            }
            for rule in rule_set.rules
            if rule.enabled
        ],
    }
