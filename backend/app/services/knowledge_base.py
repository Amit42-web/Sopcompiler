"""Knowledge base construction (Sprint 6).

Builds a glossary of domain terms from SOP text by two means:
  1. Explicit definitions — lines like ``Term: meaning`` or
     ``Term means ...`` / ``Term refers to ...``.
  2. Salient noun phrases — capitalized multi-word terms that recur, given a
     synthesized "seen N times" definition when no explicit one exists.
"""

from __future__ import annotations

import re
from collections import Counter

from app.models.schemas import KnowledgeEntry

_DEFINITION_PATTERNS = [
    re.compile(r"^\s*([A-Z][\w /-]{1,40})\s*[:\-]\s+(.{5,240})$"),
    re.compile(
        r"\b([A-Z][\w -]{1,40})\s+(?:means|refers to|is defined as)\s+(.{5,240})",
    ),
]

_ACRONYM = re.compile(r"\b([A-Z]{2,6})\b")
_CAP_PHRASE = re.compile(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b")

_STOPWORDS = {"The", "This", "That", "These", "Standard Operating"}


def build_knowledge_base(text: str, limit: int = 25) -> list[KnowledgeEntry]:
    entries: dict[str, KnowledgeEntry] = {}

    # 1. Explicit definitions.
    for line in text.splitlines():
        for pattern in _DEFINITION_PATTERNS:
            match = pattern.match(line.strip()) or pattern.search(line.strip())
            if match:
                term = match.group(1).strip()
                definition = re.sub(r"\s+", " ", match.group(2)).strip(" .")
                if term and term not in _STOPWORDS:
                    entries[term.lower()] = KnowledgeEntry(
                        term=term, definition=definition, occurrences=1
                    )
                break

    # 2. Recurring capitalized phrases / acronyms without a definition.
    phrase_counts = Counter(
        p for p in _CAP_PHRASE.findall(text) if p not in _STOPWORDS
    )
    phrase_counts.update(_ACRONYM.findall(text))

    for term, count in phrase_counts.items():
        key = term.lower()
        if key in entries:
            entries[key].occurrences = max(entries[key].occurrences, count)
        elif count >= 2:
            entries[key] = KnowledgeEntry(
                term=term,
                definition=f"Referenced {count} times in this document.",
                occurrences=count,
            )

    ranked = sorted(
        entries.values(), key=lambda e: e.occurrences, reverse=True
    )
    return ranked[:limit]
