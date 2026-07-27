"""Project CRUD endpoints (Sprint 2)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models.schemas import Project, ProjectCreate
from app.services.storage import store

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[Project])
def list_projects() -> list[Project]:
    return store.list_projects()


@router.post("", response_model=Project, status_code=201)
def create_project(payload: ProjectCreate) -> Project:
    return store.create_project(payload)


@router.get("/{project_id}", response_model=Project)
def get_project(project_id: str) -> Project:
    project = store.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project
