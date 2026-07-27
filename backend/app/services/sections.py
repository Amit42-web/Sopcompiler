"""SOP section detection (Sprint 4).

Splits raw SOP text into titled sections using heading heuristics:
  * Markdown headings (``#``, ``##`` ...)
  * Numbered headings (``1.``, ``2.3`` ...)
  * Short ALL-CAPS or Title-Case lines that look like headings

The result is a flat list of sections in document order. When no headings are
found the whole document becomes a single "Document" section so downstream
stages still have something to work with.
"""

from __future__ import annotations

import re

from app.models.schemas import SopSection
from app.services.storage import new_id

_MD_HEADING = re.compile(r"^(#{1,6})\s+(.*)$")
_NUMBERED = re.compile(r"^\s*(\d+(?:\.\d+)*)[.)]?\s+(.{2,80})$")
_KEYWORD = re.compile(
    r"^\s*(section|step|procedure|policy|scope|purpose|responsibilit(?:y|ies))\b",
    re.IGNORECASE,
)


def _looks_like_heading(line: str) -> tuple[bool, int, str]:
    """Return (is_heading, level, title) for a single line."""
    stripped = line.strip()
    if not stripped:
        return False, 0, ""

    md = _MD_HEADING.match(stripped)
    if md:
        return True, len(md.group(1)), md.group(2).strip()

    num = _NUMBERED.match(stripped)
    if num:
        level = num.group(1).count(".") + 1
        return True, min(level, 6), stripped

    if _KEYWORD.match(stripped) and len(stripped) <= 80:
        return True, 2, stripped

    # Short, mostly-uppercase lines read as headings.
    letters = [c for c in stripped if c.isalpha()]
    if (
        letters
        and len(stripped) <= 60
        and not stripped.endswith(".")
        and sum(c.isupper() for c in letters) / len(letters) > 0.7
    ):
        return True, 1, stripped

    return False, 0, ""


def detect_sections(text: str) -> list[SopSection]:
    sections: list[SopSection] = []
    current_title = "Document"
    current_level = 1
    buffer: list[str] = []

    def flush() -> None:
        body = "\n".join(buffer).strip()
        if body or len(sections) == 0:
            sections.append(
                SopSection(
                    id=new_id("sec"),
                    title=current_title,
                    level=current_level,
                    text=body,
                )
            )

    for line in text.splitlines():
        is_heading, level, title = _looks_like_heading(line)
        if is_heading:
            if buffer or sections:
                flush()
            buffer = []
            current_title = title
            current_level = level
        else:
            buffer.append(line)

    flush()

    # Drop a leading empty "Document" placeholder if real sections followed.
    if len(sections) > 1 and not sections[0].text:
        sections = sections[1:]

    return sections
