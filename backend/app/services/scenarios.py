"""Scenario extraction and resolution grouping (Sprint 5).

A "scenario" is a condition → resolution pair extracted from SOP prose. We
detect them with conditional-language heuristics (if/when/should/in case of)
and then bucket the resolutions into groups by the action verb used
(approve / deny / escalate / notify / ...).
"""

from __future__ import annotations

import re

from app.models.schemas import Scenario, SopSection
from app.services.storage import new_id

# condition ... resolution splitters, ordered by specificity.
_PATTERNS = [
    re.compile(r"\bif\b(?P<cond>.+?)\bthen\b(?P<res>.+)", re.IGNORECASE),
    re.compile(r"\bwhen\b(?P<cond>.+?)[,:](?P<res>.+)", re.IGNORECASE),
    re.compile(
        r"\bin (?:the )?(?:case|event) (?:of|that)\b(?P<cond>.+?)[,:](?P<res>.+)",
        re.IGNORECASE,
    ),
    re.compile(
        r"(?P<cond>.+?)\b(?:should|must|shall)\b(?P<res>.+)", re.IGNORECASE
    ),
]

_RESOLUTION_GROUPS: list[tuple[str, tuple[str, ...]]] = [
    ("Auto-approve", ("approve", "grant", "allow", "authorize", "accept")),
    ("Deny", ("deny", "reject", "decline", "block", "refuse")),
    ("Escalate", ("escalate", "route", "forward", "refer", "review by")),
    ("Notify", ("notify", "inform", "email", "alert", "contact")),
    ("Record", ("log", "record", "document", "flag", "note")),
]


def _clean(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip(" .,:;-")


def classify_resolution(resolution: str) -> str:
    lowered = resolution.lower()
    for group, keywords in _RESOLUTION_GROUPS:
        if any(kw in lowered for kw in keywords):
            return group
    return "Other"


def _split_sentences(text: str) -> list[str]:
    # Split on sentence boundaries and list markers.
    parts = re.split(r"(?<=[.!?])\s+|\n+|(?:^|\s)[-•*]\s+", text)
    return [p for p in (s.strip() for s in parts) if len(p) > 12]


def extract_scenarios(sections: list[SopSection]) -> list[Scenario]:
    scenarios: list[Scenario] = []

    for section in sections:
        for sentence in _split_sentences(section.text):
            for pattern in _PATTERNS:
                match = pattern.search(sentence)
                if not match:
                    continue
                condition = _clean(match.group("cond"))
                resolution = _clean(match.group("res"))
                if len(condition) < 3 or len(resolution) < 3:
                    continue

                group = classify_resolution(resolution)
                # Confidence: explicit if/then scores higher than soft modals.
                confidence = 0.9 if pattern is _PATTERNS[0] else 0.7
                if group == "Other":
                    confidence -= 0.15

                scenarios.append(
                    Scenario(
                        id=new_id("scn"),
                        section_id=section.id,
                        condition=condition,
                        resolution=resolution,
                        resolution_group=group,
                        confidence=round(confidence, 2),
                    )
                )
                break  # first matching pattern wins for this sentence

    return scenarios


def group_by_resolution(scenarios: list[Scenario]) -> dict[str, list[Scenario]]:
    """Group scenarios by their resolution group (Sprint 5 grouping output)."""
    grouped: dict[str, list[Scenario]] = {}
    for scenario in scenarios:
        grouped.setdefault(scenario.resolution_group, []).append(scenario)
    return grouped
