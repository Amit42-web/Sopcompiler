"""RuleForge AI — FastAPI application entrypoint.

Wires together the routers for projects, files, the AI pipeline, rule
generation/validation/export, and team management.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import files, health, pipeline, projects, rules, users
from app.config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="Convert SOP documents into executable Rule Engine JSON.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_prefix = "/api"
app.include_router(health.router, prefix=api_prefix)
app.include_router(projects.router, prefix=api_prefix)
app.include_router(files.router, prefix=api_prefix)
app.include_router(pipeline.router, prefix=api_prefix)
app.include_router(rules.router, prefix=api_prefix)
app.include_router(users.router, prefix=api_prefix)


@app.get("/")
def root() -> dict:
    return {
        "name": settings.app_name,
        "version": settings.version,
        "docs": "/docs",
    }
