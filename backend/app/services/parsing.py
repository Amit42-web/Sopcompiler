"""Document parsing (Sprint 3).

Extracts plain text from PDF, DOCX, and TXT/Markdown uploads. PDF and DOCX
support degrade gracefully: if the optional library is missing, a clear error
is raised rather than crashing the server at import time.
"""

from __future__ import annotations

import io
from dataclasses import dataclass

SUPPORTED_CONTENT_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/plain": "txt",
    "text/markdown": "txt",
}

SUPPORTED_EXTENSIONS = {
    ".pdf": "pdf",
    ".docx": "docx",
    ".txt": "txt",
    ".md": "txt",
}


class UnsupportedFileError(ValueError):
    """Raised when a file type cannot be parsed."""


@dataclass
class ParseResult:
    text: str
    page_count: int | None
    char_count: int


def detect_kind(filename: str, content_type: str) -> str:
    """Determine the parser to use from content type, falling back to extension."""
    if content_type in SUPPORTED_CONTENT_TYPES:
        return SUPPORTED_CONTENT_TYPES[content_type]
    lower = filename.lower()
    for ext, kind in SUPPORTED_EXTENSIONS.items():
        if lower.endswith(ext):
            return kind
    raise UnsupportedFileError(
        f"Unsupported file type: {filename} ({content_type or 'unknown'})"
    )


def _parse_pdf(raw: bytes) -> ParseResult:
    try:
        from pypdf import PdfReader
    except ImportError as exc:  # pragma: no cover - env dependent
        raise UnsupportedFileError(
            "PDF parsing requires the 'pypdf' package."
        ) from exc

    reader = PdfReader(io.BytesIO(raw))
    pages = [page.extract_text() or "" for page in reader.pages]
    text = "\n\n".join(pages).strip()
    return ParseResult(text=text, page_count=len(pages), char_count=len(text))


def _parse_docx(raw: bytes) -> ParseResult:
    try:
        import docx  # python-docx
    except ImportError as exc:  # pragma: no cover - env dependent
        raise UnsupportedFileError(
            "DOCX parsing requires the 'python-docx' package."
        ) from exc

    document = docx.Document(io.BytesIO(raw))
    lines = [p.text for p in document.paragraphs]
    text = "\n".join(lines).strip()
    return ParseResult(text=text, page_count=None, char_count=len(text))


def _parse_txt(raw: bytes) -> ParseResult:
    text = raw.decode("utf-8", errors="replace").strip()
    return ParseResult(text=text, page_count=None, char_count=len(text))


def parse_document(filename: str, content_type: str, raw: bytes) -> ParseResult:
    """Parse an uploaded document into plain text."""
    kind = detect_kind(filename, content_type)
    if kind == "pdf":
        return _parse_pdf(raw)
    if kind == "docx":
        return _parse_docx(raw)
    return _parse_txt(raw)
