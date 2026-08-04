"""Minimal dashboard endpoints required by scheduled jobs."""

from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Request

from backend.models import Application
from backend.sheets_client import SheetsClient

router = APIRouter(prefix="/dashboard", tags=["dashboard"])
INDIA_TIMEZONE = ZoneInfo("Asia/Kolkata")


def _sheets(request: Request) -> SheetsClient:
    return request.app.state.sheets


@router.get("/due-today", response_model=list[Application])
def due_today(request: Request) -> list[Application]:
    """Return applications requiring a follow-up today in the local call window."""
    today = datetime.now(INDIA_TIMEZONE).date()
    return _sheets(request).applications_due_on(today)
