"""AI pipeline orchestrator (Sprints 4–6).

Runs the full extraction pipeline over parsed SOP text:

    text
      → metadata extraction        (Sprint 6)
      → section detection          (Sprint 4)
      → scenario extraction        (Sprint 5)
      → resolution grouping        (Sprint 5)
      → LLM refinement (optional)  (Sprint 4+)
      → knowledge base             (Sprint 6)

The result feeds rule generation in Sprint 7.
"""

from __future__ import annotations

from app.models.schemas import PipelineResult
from app.services import llm
from app.services.knowledge_base import build_knowledge_base
from app.services.metadata import extract_metadata
from app.services.scenarios import extract_scenarios
from app.services.sections import detect_sections


def run_pipeline(file_id: str, text: str) -> PipelineResult:
    metadata = extract_metadata(text)
    sections = detect_sections(text)
    scenarios = extract_scenarios(sections)
    scenarios = llm.enhance_scenarios(text, scenarios)
    knowledge = build_knowledge_base(text)

    return PipelineResult(
        file_id=file_id,
        metadata=metadata,
        sections=sections,
        scenarios=scenarios,
        knowledge_base=knowledge,
    )
