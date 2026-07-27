"""In-memory data store.

Sprint scope uses a process-local store so the API is fully runnable without
a database. Swapping this for PostgreSQL (a later sprint) means replacing the
method bodies — the signatures are already database-shaped.
"""

from __future__ import annotations

import threading
import uuid
from datetime import datetime, timezone
from typing import Optional

from app.models.schemas import (
    PipelineResult,
    Project,
    ProjectCreate,
    ProjectStatus,
    RuleSet,
    SopFile,
    TeamMember,
)


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class Store:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.projects: dict[str, Project] = {}
        self.files: dict[str, SopFile] = {}
        self.file_bytes: dict[str, bytes] = {}
        self.pipeline_results: dict[str, PipelineResult] = {}
        self.rule_sets: dict[str, RuleSet] = {}
        self.members: dict[str, TeamMember] = {}
        self._seed()

    # --- Seed data ---------------------------------------------------------

    def _seed(self) -> None:
        owner = TeamMember(
            id=_new_id("usr"),
            name="Workspace Owner",
            email="owner@example.com",
            role="owner",
            status="active",
        )
        self.members[owner.id] = owner

    # --- Projects ----------------------------------------------------------

    def create_project(self, data: ProjectCreate) -> Project:
        with self._lock:
            project = Project(
                id=_new_id("prj"),
                name=data.name,
                description=data.description,
            )
            self.projects[project.id] = project
            return project

    def list_projects(self) -> list[Project]:
        return list(self.projects.values())

    def get_project(self, project_id: str) -> Optional[Project]:
        return self.projects.get(project_id)

    def touch_project(self, project_id: str) -> None:
        project = self.projects.get(project_id)
        if project:
            project.updated_at = _now()
            project.file_count = len(self.list_files(project_id))

    def set_project_status(self, project_id: str, status: ProjectStatus) -> None:
        project = self.projects.get(project_id)
        if project:
            project.status = status
            project.updated_at = _now()

    # --- Files -------------------------------------------------------------

    def add_file(self, file: SopFile, raw: bytes) -> SopFile:
        with self._lock:
            self.files[file.id] = file
            self.file_bytes[file.id] = raw
            self.touch_project(file.project_id)
            return file

    def list_files(self, project_id: str) -> list[SopFile]:
        return [f for f in self.files.values() if f.project_id == project_id]

    def get_file(self, file_id: str) -> Optional[SopFile]:
        return self.files.get(file_id)

    def get_file_bytes(self, file_id: str) -> Optional[bytes]:
        return self.file_bytes.get(file_id)

    # --- Pipeline results --------------------------------------------------

    def save_pipeline_result(self, result: PipelineResult) -> None:
        with self._lock:
            self.pipeline_results[result.file_id] = result

    def get_pipeline_result(self, file_id: str):
        return self.pipeline_results.get(file_id)

    def list_pipeline_results(self, project_id: str) -> list[PipelineResult]:
        file_ids = {f.id for f in self.list_files(project_id)}
        return [
            r for fid, r in self.pipeline_results.items() if fid in file_ids
        ]

    # --- Rule sets ---------------------------------------------------------

    def save_rule_set(self, rule_set: RuleSet) -> RuleSet:
        with self._lock:
            self.rule_sets[rule_set.id] = rule_set
            project = self.projects.get(rule_set.project_id)
            if project:
                project.rule_count = len(rule_set.rules)
                project.updated_at = _now()
            return rule_set

    def get_rule_set(self, rule_set_id: str) -> Optional[RuleSet]:
        return self.rule_sets.get(rule_set_id)

    # --- Members -----------------------------------------------------------

    def list_members(self) -> list[TeamMember]:
        return list(self.members.values())

    def add_member(self, member: TeamMember) -> TeamMember:
        with self._lock:
            self.members[member.id] = member
            return member


# Singleton store shared across requests.
store = Store()


def new_id(prefix: str) -> str:
    return _new_id(prefix)
