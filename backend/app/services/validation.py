"""Rule set validation (Sprint 9).

Checks a generated rule set for structural problems before export:
  * empty names / missing actions (errors)
  * duplicate names, contradictory conditions, unconditional rules (warnings)
  * empty rule sets (info)

Mirrors the client-side checks in ``src/components/rules/rule-builder.tsx``.
"""

from __future__ import annotations

from app.models.schemas import Rule, RuleSet, ValidationIssue, ValidationReport


def _contradicts(rule: Rule) -> bool:
    """Detect a fact compared to two different equality values in one rule."""
    seen: dict[str, object] = {}
    for cond in rule.all:
        if cond.operator.value == "equals":
            if cond.fact in seen and seen[cond.fact] != cond.value:
                return True
            seen[cond.fact] = cond.value
    return False


def validate_rule_set(rule_set: RuleSet) -> ValidationReport:
    issues: list[ValidationIssue] = []
    seen_names: set[str] = set()

    for rule in rule_set.rules:
        if not rule.name.strip():
            issues.append(
                ValidationIssue(
                    rule_id=rule.id,
                    severity="error",
                    code="EMPTY_NAME",
                    message="Rule has no name.",
                )
            )
        if rule.name in seen_names:
            issues.append(
                ValidationIssue(
                    rule_id=rule.id,
                    severity="warning",
                    code="DUPLICATE_NAME",
                    message=f'Duplicate rule name: "{rule.name}".',
                )
            )
        seen_names.add(rule.name)

        if rule.enabled and not rule.actions:
            issues.append(
                ValidationIssue(
                    rule_id=rule.id,
                    severity="error",
                    code="NO_ACTIONS",
                    message="Enabled rule has no actions.",
                )
            )
        if rule.enabled and not rule.all:
            issues.append(
                ValidationIssue(
                    rule_id=rule.id,
                    severity="warning",
                    code="NO_CONDITIONS",
                    message="Enabled rule has no conditions and always matches.",
                )
            )
        if _contradicts(rule):
            issues.append(
                ValidationIssue(
                    rule_id=rule.id,
                    severity="warning",
                    code="CONTRADICTORY_CONDITIONS",
                    message="Rule requires one fact to equal two values.",
                )
            )

    if not any(r.enabled for r in rule_set.rules):
        issues.append(
            ValidationIssue(
                severity="info",
                code="NO_ENABLED_RULES",
                message="No rules are enabled — the export will be empty.",
            )
        )

    has_error = any(i.severity == "error" for i in issues)
    return ValidationReport(
        valid=not has_error,
        issues=issues,
        checked_rules=len(rule_set.rules),
    )
