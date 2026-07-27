"""Pydantic schemas shared across the API.

These mirror the TypeScript types in `src/lib/types.ts` on the frontend.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Optional, Union

from pydantic import BaseModel, Field


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# --- Enums -----------------------------------------------------------------


class ProjectStatus(str, Enum):
    draft = "draft"
    processing = "processing"
    ready = "ready"
    error = "error"


class FileStatus(str, Enum):
    uploaded = "uploaded"
    parsing = "parsing"
    parsed = "parsed"
    processing = "processing"
    processed = "processed"
    error = "error"


class RuleOperator(str, Enum):
    equals = "equals"
    not_equals = "not_equals"
    contains = "contains"
    greater_than = "greater_than"
    less_than = "less_than"
    in_ = "in"


# --- Projects & files ------------------------------------------------------


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = ""


class Project(BaseModel):
    id: str
    name: str
    description: str = ""
    status: ProjectStatus = ProjectStatus.draft
    file_count: int = 0
    rule_count: int = 0
    created_at: str = Field(default_factory=_now)
    updated_at: str = Field(default_factory=_now)


class SopFile(BaseModel):
    id: str
    project_id: str
    filename: str
    content_type: str
    size_bytes: int
    status: FileStatus = FileStatus.uploaded
    page_count: Optional[int] = None
    char_count: Optional[int] = None
    created_at: str = Field(default_factory=_now)


# --- Pipeline outputs ------------------------------------------------------


class SopSection(BaseModel):
    id: str
    title: str
    level: int = 1
    text: str = ""


class Scenario(BaseModel):
    id: str
    section_id: str
    condition: str
    resolution: str
    resolution_group: str = "Uncategorized"
    confidence: float = 0.5


class SopMetadata(BaseModel):
    title: Optional[str] = None
    department: Optional[str] = None
    version: Optional[str] = None
    effective_date: Optional[str] = None
    owner: Optional[str] = None
    tags: list[str] = Field(default_factory=list)


class KnowledgeEntry(BaseModel):
    term: str
    definition: str
    occurrences: int = 1


class PipelineResult(BaseModel):
    file_id: str
    metadata: SopMetadata
    sections: list[SopSection]
    scenarios: list[Scenario]
    knowledge_base: list[KnowledgeEntry]


# --- Rules -----------------------------------------------------------------


class RuleCondition(BaseModel):
    fact: str
    operator: RuleOperator
    value: Union[str, int, float, bool]


class RuleAction(BaseModel):
    type: str
    target: str
    value: Optional[Union[str, int, float, bool]] = None


class Rule(BaseModel):
    id: str
    name: str
    description: str = ""
    priority: int = 50
    all: list[RuleCondition] = Field(default_factory=list)
    actions: list[RuleAction] = Field(default_factory=list)
    enabled: bool = True
    source_scenario_id: Optional[str] = None


class RuleSet(BaseModel):
    id: str
    project_id: str
    name: str
    version: str = "1.0.0"
    rules: list[Rule] = Field(default_factory=list)
    created_at: str = Field(default_factory=_now)


# --- Validation ------------------------------------------------------------


class ValidationIssue(BaseModel):
    rule_id: Optional[str] = None
    severity: str = "warning"  # error | warning | info
    code: str
    message: str


class ValidationReport(BaseModel):
    valid: bool
    issues: list[ValidationIssue]
    checked_rules: int


# --- Users -----------------------------------------------------------------


class TeamMember(BaseModel):
    id: str
    name: str
    email: str
    role: str = "viewer"  # owner | admin | editor | viewer
    status: str = "active"  # active | invited


class TeamInvite(BaseModel):
    name: str = ""
    email: str
    role: str = "viewer"
