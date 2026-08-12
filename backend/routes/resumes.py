"""Resume API routes."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel

from backend.auth import get_current_user
from backend.db.models import User

from backend import db_client

router = APIRouter(prefix="/resumes", tags=["resumes"])


class ResumeResponse(BaseModel):
    id: str
    filename: str
    uploaded_at: str


class ResumeUrlResponse(BaseModel):
    url: str


@router.post("", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
def upload_resume(file: UploadFile = File(...), user: User = Depends(get_current_user)) -> ResumeResponse:
    """Upload a new resume PDF."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF files are allowed")
    
    file_bytes = file.file.read()
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file")

    import io
    file_io = io.BytesIO(file_bytes)
    resume = db_client.upload_resume(user.id, file_io, file.filename)
    return ResumeResponse(
        id=resume.id,
        filename=resume.filename,
        uploaded_at=resume.uploaded_at.isoformat()
    )


@router.get("", response_model=list[ResumeResponse])
def list_resumes(user: User = Depends(get_current_user)) -> list[ResumeResponse]:
    """Return all available resumes."""
    resumes = db_client.list_resumes(user.id)
    return [
        ResumeResponse(
            id=r.id,
            filename=r.filename,
            uploaded_at=r.uploaded_at.isoformat()
        )
        for r in resumes
    ]


@router.get("/{resume_id}/url", response_model=ResumeUrlResponse)
def get_resume_url(resume_id: str, user: User = Depends(get_current_user)) -> ResumeUrlResponse:
    """Get a short-lived presigned URL for a specific resume."""
    url = db_client.get_resume_presigned_url(user.id, resume_id)
    if not url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
    return ResumeUrlResponse(url=url)
