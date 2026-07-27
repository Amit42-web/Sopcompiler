"""SOP metadata extraction (Sprint 6).

Pulls document-level metadata (title, department, version, effective date,
owner) from the header region of an SOP using labelled-field heuristics, plus
a set of topical tags derived from keyword frequency.
"""

from __future__ import annotations

import re

from app.models.schemas import SopMetadata

_FIELD_PATTERNS = {
    "department": re.compile(r"^\s*department\s*[:\-]\s*(.+)$", re.IGNORECASE),
    "version": re.compile(
        r"^\s*(?:version|revision|rev)\s*[:\-]?\s*v?\s*([\w.]+)$", re.IGNORECASE
    ),
    "effective_date": re.compile(
        r"^\s*(?:effective(?:\s+date)?|date)\s*[:\-]\s*(.+)$", re.IGNORECASE
    ),
    "owner": re.compile(
        r"^\s*(?:owner|author|approved by|prepared by)\s*[:\-]\s*(.+)$",
        re.IGNORECASE,
    ),
    "title": re.compile(
        r"^\s*(?:title|sop title|document)\s*[:\-]\s*(.+)$", re.IGNORECASE
    ),
}

_TAG_KEYWORDS = {
    "refund": "refunds",
    "onboard": "onboarding",
    "complian": "compliance",
    "security": "security",
    "approval": "approvals",
    "escalat": "escalation",
    "privacy": "privacy",
    "payment": "payments",
    "hr ": "hr",
    "audit": "audit",
}


def extract_metadata(text: str) -> SopMetadata:
    meta = SopMetadata()
    header = text.splitlines()[:25]

    for line in header:
        for field, pattern in _FIELD_PATTERNS.items():
            match = pattern.match(line)
            if match and not getattr(meta, field):
                setattr(meta, field, match.group(1).strip())

    # Fall back to the first non-empty line as the title.
    if not meta.title:
        for line in text.splitlines():
            if line.strip():
                meta.title = line.strip()[:120]
                break

    lowered = text.lower()
    tags = sorted(
        {tag for needle, tag in _TAG_KEYWORDS.items() if needle in lowered}
    )
    meta.tags = tags
    return meta
