"""Analytics API routes."""

from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query, Request

from backend.auth import get_current_user
from backend.db.models import User
from backend.models import DailySnapshot
from backend.scheduler import take_daily_snapshot
from backend import db_client

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _compute_delta(current: float | int, previous: float | int) -> float | None:
    if previous == 0:
        return None
    return round(((current - previous) / previous) * 100, 1)


@router.get("/overview")
def get_analytics_overview(
    request: Request,
    user: User = Depends(get_current_user),
    range: str = Query("7d", description="Time range: 7d, 30d, or custom")
) -> dict:
    """Return current pipeline totals plus trend deltas from historical snapshots."""
    # Generate today's snapshot on the fly so totals are perfectly fresh,
    # without needing to wait for the 9 PM cron job.
    # We call the logic directly for the current user instead of the global cron trigger
    stats = db_client.get_current_pipeline_stats(user.id)
    current_snapshot = DailySnapshot(
        date=date.today(),
        total_applications=stats["Total"],
        not_contacted=stats["Not Contacted"],
        in_progress=stats["In Progress"],
        interviewing=stats["Interviewing"],
        offer_received=stats["Offer Received"],
        rejected=stats["Rejected"],
        ghosted=stats["Ghosted"],
        response_rate=round(stats["response_rate"], 2),
        calls_dialed=stats["calls_dialed"],
        calls_connected=stats["calls_connected"],
        interviews_attended=stats["interviews_attended"],
    )
    db_client.save_daily_snapshot(user.id, current_snapshot)
    
    # Get history
    history = db_client.list_daily_snapshots(user.id)
    
    days_back = 7
    if range == "30d":
        days_back = 30
        
    target_date = current_snapshot.date - timedelta(days=days_back)
    
    # Find the closest snapshot on or before the target date
    past_snapshot = None
    for snap in sorted(history, key=lambda x: x.date, reverse=True):
        if snap.date <= target_date:
            past_snapshot = snap
            break
            
    # Calculate deltas
    deltas = {}
    if past_snapshot:
        deltas = {
            "total_applications": _compute_delta(current_snapshot.total_applications, past_snapshot.total_applications),
            "interviews_attended": _compute_delta(current_snapshot.interviews_attended, past_snapshot.interviews_attended),
            "offer_received": _compute_delta(current_snapshot.offer_received, past_snapshot.offer_received),
            "response_rate": _compute_delta(current_snapshot.response_rate, past_snapshot.response_rate),
        }
        
    sources = db_client.get_application_sources(user.id)

    return {
        "current": current_snapshot.model_dump(),
        "deltas": deltas,
        "past_date": past_snapshot.date.isoformat() if past_snapshot else None,
        "history": [snap.model_dump() for snap in sorted(history, key=lambda x: x.date)],
        "sources": sources
    }


@router.post("/snapshot")
def trigger_snapshot(
    request: Request,
    user: User = Depends(get_current_user)
) -> DailySnapshot:
    """Manually trigger a daily snapshot write (for testing/verification)."""
    stats = db_client.get_current_pipeline_stats(user.id)
    snapshot = DailySnapshot(
        date=date.today(),
        total_applications=stats["Total"],
        not_contacted=stats["Not Contacted"],
        in_progress=stats["In Progress"],
        interviewing=stats["Interviewing"],
        offer_received=stats["Offer Received"],
        rejected=stats["Rejected"],
        ghosted=stats["Ghosted"],
        response_rate=round(stats["response_rate"], 2),
        calls_dialed=stats["calls_dialed"],
        calls_connected=stats["calls_connected"],
        interviews_attended=stats["interviews_attended"],
    )
    db_client.save_daily_snapshot(user.id, snapshot)
    return snapshot
