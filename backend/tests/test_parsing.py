"""Tests for document parsing (Sprint 3)."""

from __future__ import annotations

import pytest

from app.services import parsing


def test_parse_txt():
    result = parsing.parse_document("sop.txt", "text/plain", b"Hello world")
    assert result.text == "Hello world"
    assert result.char_count == 11
    assert result.page_count is None


def test_detect_kind_by_extension():
    assert parsing.detect_kind("a.pdf", "") == "pdf"
    assert parsing.detect_kind("a.docx", "") == "docx"
    assert parsing.detect_kind("a.md", "") == "txt"


def test_unsupported_type_raises():
    with pytest.raises(parsing.UnsupportedFileError):
        parsing.detect_kind("image.png", "image/png")
