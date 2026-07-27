"""Rule generation, validation, and export endpoints (Sprints 7 & 9)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse

from app.models.schemas import RuleSet, ValidationReport
from app.services import export as export_service
from app.services import rules_engine, validation
from app.services.storage import store

router = APIRouter(tags=["rules"])


@router.post("/projects/{project_id}/rules", response_model=RuleSet)
def generate_rules(project_id: str) -> RuleSet:
    if not store.get_project(project_id):
        raise HTTPException(status_code=404, detail="Project not found")

    results = store.list_pipeline_results(project_id)
    if not results:
        raise HTTPException(
            status_code=422,
            detail="Run the pipeline on at least one file before generating rules.",
        )

    rule_set = rules_engine.generate_rule_set(project_id, results)
    store.save_rule_set(rule_set)
    return rule_set


@router.get("/rules/{rule_set_id}", response_model=RuleSet)
def get_rule_set(rule_set_id: str) -> RuleSet:
    rule_set = store.get_rule_set(rule_set_id)
    if not rule_set:
        raise HTTPException(status_code=404, detail="Rule set not found")
    return rule_set


@router.post("/rules/{rule_set_id}/validate", response_model=ValidationReport)
def validate_rules(rule_set_id: str) -> ValidationReport:
    rule_set = store.get_rule_set(rule_set_id)
    if not rule_set:
        raise HTTPException(status_code=404, detail="Rule set not found")
    return validation.validate_rule_set(rule_set)


@router.get("/rules/{rule_set_id}/export")
def export_rules(rule_set_id: str, format: str = "json"):
    rule_set = store.get_rule_set(rule_set_id)
    if not rule_set:
        raise HTTPException(status_code=404, detail="Rule set not found")

    if format == "summary":
        return PlainTextResponse(
            export_service.export_summary(rule_set),
            media_type="text/plain",
            headers={
                "Content-Disposition": "attachment; filename=ruleset.txt"
            },
        )

    return PlainTextResponse(
        export_service.export_json(rule_set),
        media_type="application/json",
        headers={
            "Content-Disposition": "attachment; filename=ruleset.json"
        },
    )
