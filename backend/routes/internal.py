"""Internal endpoints used by scheduled Phase 2 jobs and manual verification."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Security, status
from fastapi.security import APIKeyHeader
import os

from backend.llm_feedback import GroqFeedbackService
from backend.models import DailyCoachingInput, DailyFeedback
from backend.scheduler import ApplyOpsScheduler
from backend.telegram_bot import TelegramBot

_internal_api_key_header = APIKeyHeader(name="X-Internal-API-Key", auto_error=True)

def verify_internal_api_key(api_key_header: str = Security(_internal_api_key_header)) -> None:
    expected = os.environ.get("INTERNAL_API_KEY")
    if not expected:
        # If not configured, we should reject everything to be safe
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="INTERNAL_API_KEY is not configured",
        )
    if api_key_header != expected:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid internal API key",
        )

router = APIRouter(prefix="/internal", tags=["internal"], dependencies=[Depends(verify_internal_api_key)])


def _scheduler(request: Request) -> ApplyOpsScheduler:
    return request.app.state.scheduler


def _feedback_service(request: Request) -> GroqFeedbackService:
    return request.app.state.feedback_service


def _telegram(request: Request) -> TelegramBot:
    return request.app.state.telegram


@router.post("/reminder-check")
def reminder_check(request: Request) -> dict[str, int | bool]:
    """Run the due-today reminder job once; intended for scheduler and setup checks."""
    due_count = _scheduler(request).run_reminder_check()
    return {"sent": due_count > 0, "due_count": due_count}


@router.post("/daily-feedback", response_model=DailyFeedback)
def daily_feedback(payload: DailyCoachingInput, request: Request) -> DailyFeedback:
    """Generate and send one short coaching message for supplied daily metrics."""
    feedback = _feedback_service(request).generate(payload)
    _telegram(request).send_message(feedback.message)
    return feedback
