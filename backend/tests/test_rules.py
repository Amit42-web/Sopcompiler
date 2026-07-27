"""Tests for rule generation, validation, and export (Sprints 7 & 9)."""

from __future__ import annotations

from app.models.schemas import (
    Rule,
    RuleAction,
    RuleCondition,
    RuleOperator,
    RuleSet,
)
from app.services import export as export_service
from app.services import pipeline, rules_engine, validation


def _build_rule_set() -> RuleSet:
    text = (
        "1. Eligibility\n"
        "If the order age is less than 30 days then approve the full refund.\n"
        "If the customer has more than 3 refunds then deny the refund.\n"
    )
    result = pipeline.run_pipeline("file_x", text)
    return rules_engine.generate_rule_set("prj_x", [result])


def test_generate_rules_from_pipeline():
    rule_set = _build_rule_set()
    assert rule_set.rules
    # Conditions were parsed into typed facts/operators.
    first = rule_set.rules[0]
    assert first.all
    assert first.all[0].operator in set(RuleOperator)


def test_engine_json_shape():
    rule_set = _build_rule_set()
    payload = rules_engine.to_engine_json(rule_set)
    assert payload["version"] == "1.0.0"
    assert isinstance(payload["rules"], list)
    if payload["rules"]:
        rule = payload["rules"][0]
        assert "conditions" in rule and "all" in rule["conditions"]
        assert rule["event"]["type"] == "ruleforge.match"


def test_validation_flags_missing_actions():
    rule_set = RuleSet(
        id="rst_1",
        project_id="prj_1",
        name="Test",
        rules=[
            Rule(
                id="r1",
                name="",
                all=[
                    RuleCondition(
                        fact="x", operator=RuleOperator.equals, value=1
                    )
                ],
                actions=[],
                enabled=True,
            )
        ],
    )
    report = validation.validate_rule_set(rule_set)
    assert not report.valid
    codes = {i.code for i in report.issues}
    assert "EMPTY_NAME" in codes
    assert "NO_ACTIONS" in codes


def test_export_json_and_summary():
    rule_set = _build_rule_set()
    json_str = export_service.export_json(rule_set)
    assert '"rules"' in json_str
    summary = export_service.export_summary(rule_set)
    assert summary.startswith("# Generated rule set")
