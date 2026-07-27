"""AI pipeline endpoint (Sprints 4–6).

Runs section detection, scenario extraction, resolution grouping, metadata
extraction, and knowledge-base construction over a parsed file.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models.schemas import FileStatus, PipelineResult
from app.services import pipeline
from app.services.storage import store

router = APIRouter(tags=["pipeline"])


@router.post("/files/{file_id}/pipeline", response_model=PipelineResult)
def run_pipeline(file_id: str) -> PipelineResult:
    record = store.get_file(file_id)
    if not record:
        raise HTTPException(status_code=404, detail="File not found")

    raw = store.get_file_bytes(file_id) or b""
    text = raw.decode("utf-8", errors="replace")
    if not text.strip():
        raise HTTPException(status_code=422, detail="File has no extractable text")

    record.status = FileStatus.processing
    result = pipeline.run_pipeline(file_id, text)
    store.save_pipeline_result(result)
    record.status = FileStatus.processed
    return result


@router.get("/files/{file_id}/pipeline", response_model=PipelineResult)
def get_pipeline_result(file_id: str) -> PipelineResult:
    result = store.get_pipeline_result(file_id)
    if not result:
        raise HTTPException(status_code=404, detail="No pipeline result yet")
    return result
