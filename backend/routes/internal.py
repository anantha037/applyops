"""Internal endpoints used by scheduled Phase 2 jobs and manual verification."""

from __future__ import annotations

from fastapi import APIRouter, Request

from backend.scheduler import ApplyOpsScheduler

router = APIRouter(prefix="/internal", tags=["internal"])


def _scheduler(request: Request) -> ApplyOpsScheduler:
    return request.app.state.scheduler


@router.post("/reminder-check")
def reminder_check(request: Request) -> dict[str, int | bool]:
    """Run the due-today reminder job once; intended for scheduler and setup checks."""
    due_count = _scheduler(request).run_reminder_check()
    return {"sent": due_count > 0, "due_count": due_count}
