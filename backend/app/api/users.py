"""Team / user management endpoints (Sprint 9).

Lightweight membership management. Real authentication (Supabase) arrives in a
later sprint; here we manage the member roster in the in-memory store.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.models.schemas import TeamInvite, TeamMember
from app.services.storage import new_id, store

router = APIRouter(prefix="/team", tags=["team"])


@router.get("", response_model=list[TeamMember])
def list_members() -> list[TeamMember]:
    return store.list_members()


@router.post("/invite", response_model=TeamMember, status_code=201)
def invite_member(payload: TeamInvite) -> TeamMember:
    member = TeamMember(
        id=new_id("usr"),
        name=payload.name or payload.email.split("@")[0],
        email=payload.email,
        role=payload.role,
        status="invited",
    )
    return store.add_member(member)
