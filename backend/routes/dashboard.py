"""Minimal dashboard endpoints required by scheduled jobs."""

from __future__ import annotations

from datetime import datetime
from collections import Counter
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Request

from backend.auth import get_current_user
from backend.db.models import User
from backend.db.session import get_session
from sqlmodel import Session

from backend.models import Application
from backend import db_client

router = APIRouter(prefix="/dashboard", tags=["dashboard"])
INDIA_TIMEZONE = ZoneInfo("Asia/Kolkata")


@router.get("/due-today", response_model=list[Application])
def due_today(request: Request, user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> list[Application]:
    """Return applications requiring a follow-up today in the local call window."""
    today = datetime.now(INDIA_TIMEZONE).date()
    return db_client.applications_due_on(user.id, today, session=session)


@router.get("/summary")
def summary(request: Request, user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> dict[str, object]:
    today = datetime.now(INDIA_TIMEZONE).date()
    settings = db_client.get_settings(user.id, session=session)
    stats = db_client.get_current_pipeline_stats(user.id, session=session)

    from sqlmodel import select, func
    from backend.db.models import DBApplication
    today_count = session.exec(
        select(func.count(DBApplication.id))
        .where(DBApplication.user_id == user.id, DBApplication.date_applied == today)
    ).one()

    activities_today = db_client.list_activity(user.id, today, session=session)
    calls_today = sum(1 for act in activities_today if act.action_type in ("Call Dialed", "Call Connected", "Recruiter Call"))

    # Map stats back to the funnel expected by the UI
    funnel = {
        "Total": stats["Total"],
        "Not Contacted": stats["Not Contacted"],
        "In Progress": stats["In Progress"],
        "Interviewing": stats["Interviewing"],
        "Offer Received": stats["Offer Received"],
        "Rejected": stats["Rejected"],
        "Ghosted": stats["Ghosted"],
    }

    return {
        "today_count": today_count,
        "applications_today": today_count,
        "goal": settings.daily_goal,
        "calls_goal": getattr(settings, "daily_calls_goal", 10),
        "calls_today": calls_today,
        "streak": 0,
        "funnel": funnel,
        "response_rate": round(stats["response_rate"]),
        "interviews_count": funnel["Interviewing"],
        "offers_count": funnel["Offer Received"],
        "ghosted_count": funnel["Ghosted"]
    }


@router.get("/daily-report")
def daily_report(request: Request, user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> dict[str, object]:
    today = datetime.now(INDIA_TIMEZONE).date()
    
    from sqlmodel import select, func, or_
    from backend.db.models import DBApplication
    applications_sent = session.exec(
        select(func.count(DBApplication.id))
        .where(DBApplication.user_id == user.id, DBApplication.date_applied == today)
    ).one()
    
    methods = session.exec(
        select(DBApplication.application_method, func.count(DBApplication.id))
        .where(DBApplication.user_id == user.id, DBApplication.date_applied == today)
        .group_by(DBApplication.application_method)
    ).all()
    method_breakdown = {m or "Other": c for m, c in methods}
    
    interviews_in_pipeline = session.exec(
        select(func.count(DBApplication.id))
        .where(
            DBApplication.user_id == user.id,
            or_(
                DBApplication.status == "Interviewing",
                DBApplication.interview_date >= today
            )
        )
    ).one()
    
    activity = db_client.list_activity(user.id, today, session=session)
    return {
        "calls_dialed": sum(item.action_type == "Call Dialed" for item in activity),
        "calls_connected": sum(item.action_type == "Call Connected" for item in activity),
        "interviews_attended": sum(item.action_type == "Interview Completed" for item in activity),
        "applications_sent": applications_sent,
        "method_breakdown": method_breakdown,
        "interviews_in_pipeline": interviews_in_pipeline
    }
