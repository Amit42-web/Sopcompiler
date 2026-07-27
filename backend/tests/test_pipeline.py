"""Tests for the AI pipeline (Sprints 4–6)."""

from __future__ import annotations

from app.services import pipeline
from app.services.metadata import extract_metadata
from app.services.scenarios import classify_resolution, extract_scenarios
from app.services.sections import detect_sections

SAMPLE_SOP = """Refund Policy
Department: Customer Support
Version: 2.1
Effective Date: 2026-01-01

1. Eligibility
If the order age is less than 30 days then approve the full refund.
When the order is older than 30 days, escalate to a manager for review.

2. Fraud Checks
If the customer has more than 3 refunds in 90 days then deny the refund.
"""


def test_sections_detected():
    sections = detect_sections(SAMPLE_SOP)
    titles = [s.title for s in sections]
    assert any("Eligibility" in t for t in titles)
    assert any("Fraud" in t for t in titles)


def test_metadata_extracted():
    meta = extract_metadata(SAMPLE_SOP)
    assert meta.department == "Customer Support"
    assert meta.version == "2.1"
    assert "refunds" in meta.tags


def test_scenarios_and_grouping():
    sections = detect_sections(SAMPLE_SOP)
    scenarios = extract_scenarios(sections)
    assert len(scenarios) >= 3
    groups = {s.resolution_group for s in scenarios}
    assert "Auto-approve" in groups
    assert "Deny" in groups
    assert "Escalate" in groups


def test_classify_resolution():
    assert classify_resolution("approve the refund") == "Auto-approve"
    assert classify_resolution("deny the request") == "Deny"
    assert classify_resolution("escalate to a manager") == "Escalate"


def test_full_pipeline():
    result = pipeline.run_pipeline("file_test", SAMPLE_SOP)
    assert result.file_id == "file_test"
    assert result.sections
    assert result.scenarios
    assert result.metadata.department == "Customer Support"
