"""Minimal dashboard endpoints required by scheduled jobs."""

from __future__ import annotations

from datetime import datetime
from collections import Counter
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


@router.get("/summary")
def summary(request: Request) -> dict[str, object]:
    sheets = _sheets(request)
    today = datetime.now(INDIA_TIMEZONE).date()
    applications = sheets.list_applications()
    settings = sheets.get_settings()
    all_activities = sheets.list_activity(None)

    today_count = sum(app.date_applied == today for app in applications)

    # Derive additional stats for v2 dashboard
    interviews_count = sum(app.status == "Interviewing" for app in applications)
    offers_count = sum(app.status == "Offer Received" for app in applications)
    ghosted_count = sum(app.status == "Ghosted" for app in applications)

    contacted_apps = [app for app in applications if app.status != "Not Contacted"]
    total_contacted = len(contacted_apps)
    
    responded_app_ids = {
        act.application_id for act in all_activities
        if act.action_type in ("Call Connected", "Interview Completed")
    }
    contacted_and_responded = sum(1 for app in contacted_apps if app.id in responded_app_ids)
    
    response_rate = (contacted_and_responded / total_contacted * 100) if total_contacted > 0 else 0
    response_rate = round(response_rate)

    return {
        "today_count": today_count,
        "applications_today": today_count,
        "goal": settings.daily_goal,
        "streak": 0,
        "funnel": dict(Counter(app.status for app in applications)),
        "response_rate": response_rate,
        "interviews_count": interviews_count,
        "offers_count": offers_count,
        "ghosted_count": ghosted_count,
    }


@router.get("/daily-report")
def daily_report(request: Request) -> dict[str, object]:
    sheets = _sheets(request)
    today = datetime.now(INDIA_TIMEZONE).date()
    applications = sheets.list_applications()
    activity = sheets.list_activity(today)
    today_apps = [app for app in applications if app.date_applied == today]
    return {
        "calls_dialed": sum(item.action_type == "Call Dialed" for item in activity),
        "calls_connected": sum(item.action_type == "Call Connected" for item in activity),
        "applications_sent": len(today_apps),
        "method_breakdown": dict(Counter(app.application_method or "Other" for app in today_apps)),
        "interviews_attended": sum(item.action_type == "Interview Completed" for item in activity),
        "interviews_in_pipeline": sum(
            app.status == "Interviewing" or (app.interview_date is not None and app.interview_date >= today)
            for app in applications
        ),
    }
