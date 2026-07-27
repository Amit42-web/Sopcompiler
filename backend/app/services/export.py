"""Rule set export (Sprint 9).

Serializes a rule set to downloadable formats. JSON is the primary target
(Rule Engine JSON); a human-readable summary is also provided.
"""

from __future__ import annotations

import json

from app.models.schemas import RuleSet
from app.services.rules_engine import to_engine_json


def export_json(rule_set: RuleSet) -> str:
    return json.dumps(to_engine_json(rule_set), indent=2)


def export_summary(rule_set: RuleSet) -> str:
    lines = [
        f"# {rule_set.name} (v{rule_set.version})",
        f"Rules: {len(rule_set.rules)}",
        "",
    ]
    for rule in rule_set.rules:
        state = "on" if rule.enabled else "off"
        lines.append(f"- [{state}] {rule.name} (priority {rule.priority})")
        for cond in rule.all:
            lines.append(
                f"    when {cond.fact} {cond.operator.value} {cond.value}"
            )
        for action in rule.actions:
            target = action.target
            value = f" = {action.value}" if action.value is not None else ""
            lines.append(f"    then {action.type} {target}{value}")
    return "\n".join(lines)
