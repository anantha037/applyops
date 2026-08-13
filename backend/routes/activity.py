"""Activity endpoints."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any
from uuid import uuid4
from zoneinfo import ZoneInfo
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from backend.auth import get_current_user
from backend.db.models import User
from backend.models import Activity, ActivityCreate
from backend import db_client


router = APIRouter(tags=["activity"])


@router.post("/activity", response_model=Activity, status_code=status.HTTP_201_CREATED)
def create_activity(payload: ActivityCreate, request: Request, user: User = Depends(get_current_user)) -> Activity:
    return db_client.create_activity(user.id, str(uuid4()), payload)


@router.get("/activity", response_model=list[Activity])
def list_activity(
    request: Request, user: User = Depends(get_current_user), date_filter: str = Query(default="today", alias="date")
) -> list[Activity]:
    if date_filter == "today":
        activity_date = date.today()
    else:
        try:
            activity_date = date.fromisoformat(date_filter)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="date must be 'today' or an ISO date (YYYY-MM-DD)",
            ) from exc
    return db_client.list_activity(user.id, activity_date)


@router.get("/activity/streak")
def get_streak(request: Request, user: User = Depends(get_current_user)) -> dict[str, Any]:
    india_tz = ZoneInfo("Asia/Kolkata")
    today = datetime.now(india_tz).date()
    
    apps = db_client.list_applications(user.id)
    activities = db_client.list_activity(user.id, None)

    daily_stats = defaultdict(lambda: {
        "applications": 0, "followUps": 0, "interviews": 0, "recruiterCalls": 0, "total": 0
    })

    for a in apps:
        if a.date_applied:
            try:
                d = a.date_applied if isinstance(a.date_applied, date) else date.fromisoformat(a.date_applied)
                daily_stats[d]["applications"] += 1
                daily_stats[d]["total"] += 1
            except ValueError:
                pass
                
    for act in activities:
        if act.timestamp:
            if act.timestamp.tzinfo:
                d = act.timestamp.astimezone(india_tz).date()
            else:
                d = act.timestamp.replace(tzinfo=ZoneInfo("UTC")).astimezone(india_tz).date()
            
            if act.action_type == "Follow Up":
                daily_stats[d]["followUps"] += 1
            elif act.action_type in ("Interview Completed", "Interview Scheduled"):
                daily_stats[d]["interviews"] += 1
            elif act.action_type in ("Call Connected", "Call Dialed", "Recruiter Call"):
                daily_stats[d]["recruiterCalls"] += 1
            daily_stats[d]["total"] += 1

    active_dates = set(d for d, stats in daily_stats.items() if stats["total"] > 0)
    sorted_active = sorted(list(active_dates), reverse=True)

    current_streak = 0
    d_check = today
    if sorted_active:
        if d_check in sorted_active:
            while d_check in sorted_active:
                current_streak += 1
                d_check -= timedelta(days=1)
        elif (d_check - timedelta(days=1)) in sorted_active:
            d_check -= timedelta(days=1)
            while d_check in sorted_active:
                current_streak += 1
                d_check -= timedelta(days=1)

    best_streak = 0
    if sorted_active:
        sorted_asc = sorted(list(active_dates))
        temp_streak = 1
        best_streak = 1
        for i in range(1, len(sorted_asc)):
            if (sorted_asc[i] - sorted_asc[i-1]).days == 1:
                temp_streak += 1
                best_streak = max(best_streak, temp_streak)
            else:
                temp_streak = 1

    all_days = []
    for i in range(89, -1, -1):
        curr_d = today - timedelta(days=i)
        stats = daily_stats[curr_d]
        all_days.append({
            "date": curr_d.isoformat(),
            "displayDate": curr_d.strftime("%a, %b %d").replace(" 0", " "),
            "total": stats["total"],
            "applications": stats["applications"],
            "followUps": stats["followUps"],
            "interviews": stats["interviews"],
            "recruiterCalls": stats["recruiterCalls"],
            "isToday": curr_d == today
        })

    last_14 = all_days[-14:]
    return {
        "currentStreak": current_streak,
        "bestStreak": best_streak,
        "totalApplications": sum(d["applications"] for d in last_14),
        "activeDays": sum(1 for d in last_14 if d["total"] > 0),
        "todayCompleted": daily_stats[today]["total"] > 0,
        "last14Days": last_14,
        "allDays": all_days
    }
