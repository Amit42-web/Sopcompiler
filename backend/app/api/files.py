"""File upload & management endpoints (Sprints 2–3).

Upload accepts a document, parses it immediately (PDF/DOCX/TXT), and stores
the extracted text alongside file metadata.
"""

from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.models.schemas import FileStatus, SopFile
from app.services import parsing
from app.services.storage import new_id, store

router = APIRouter(tags=["files"])


@router.get("/projects/{project_id}/files", response_model=list[SopFile])
def list_files(project_id: str) -> list[SopFile]:
    if not store.get_project(project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    return store.list_files(project_id)


@router.post(
    "/projects/{project_id}/files", response_model=SopFile, status_code=201
)
async def upload_file(
    project_id: str, file: UploadFile = File(...)
) -> SopFile:
    if not store.get_project(project_id):
        raise HTTPException(status_code=404, detail="Project not found")

    raw = await file.read()
    record = SopFile(
        id=new_id("file"),
        project_id=project_id,
        filename=file.filename or "untitled",
        content_type=file.content_type or "application/octet-stream",
        size_bytes=len(raw),
        status=FileStatus.uploaded,
    )

    # Parse immediately (Sprint 3).
    try:
        parsed = parsing.parse_document(
            record.filename, record.content_type, raw
        )
        record.page_count = parsed.page_count
        record.char_count = parsed.char_count
        record.status = FileStatus.parsed
        store.add_file(record, raw)
        # Cache extracted text on the bytes store for the pipeline to reuse.
        store.file_bytes[record.id] = parsed.text.encode("utf-8")
    except parsing.UnsupportedFileError as exc:
        record.status = FileStatus.error
        store.add_file(record, raw)
        raise HTTPException(status_code=415, detail=str(exc)) from exc

    return record


@router.get("/files/{file_id}", response_model=SopFile)
def get_file(file_id: str) -> SopFile:
    record = store.get_file(file_id)
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    return record
