"""Analytics API routes."""

from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter, Request, Query

from backend.models import DailySnapshot
from backend.scheduler import take_daily_snapshot
from backend.sheets_client import SheetsClient

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _sheets(request: Request) -> SheetsClient:
    return request.app.state.sheets


def _compute_delta(current: float | int, previous: float | int) -> float | None:
    if previous == 0:
        return None
    return round(((current - previous) / previous) * 100, 1)


@router.get("/overview")
def get_analytics_overview(
    request: Request,
    range: str = Query("7d", description="Time range: 7d, 30d, or custom")
) -> dict:
    """Return current pipeline totals plus trend deltas from historical snapshots."""
    sheets = _sheets(request)
    
    # Generate today's snapshot on the fly so totals are perfectly fresh,
    # without needing to wait for the 9 PM cron job.
    # Note: We don't save this to the sheet here, we just compute it.
    # We could save it, but we'll just build it in memory for the response.
    # Actually, let's just trigger take_daily_snapshot so it saves and we have the latest.
    current_snapshot = take_daily_snapshot(sheets)
    
    # Get history
    history = sheets.list_daily_snapshots()
    
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
        
    # Calculate source breakdown from all applications
    applications = sheets.list_applications()
    from collections import Counter
    sources = dict(Counter(app.application_method or "Others" for app in applications))

    return {
        "current": current_snapshot.model_dump(),
        "deltas": deltas,
        "past_date": past_snapshot.date.isoformat() if past_snapshot else None,
        "history": [snap.model_dump() for snap in sorted(history, key=lambda x: x.date)],
        "sources": sources
    }


@router.post("/snapshot")
def trigger_snapshot(request: Request) -> DailySnapshot:
    """Manually trigger a daily snapshot write (for testing/verification)."""
    return take_daily_snapshot(_sheets(request))
