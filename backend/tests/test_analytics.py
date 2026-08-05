"""
Tests for Analytics API and Daily Snapshot generation.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.models import Application, Activity, DailySnapshot
from backend.routes.analytics import router as analytics_router
from backend.scheduler import take_daily_snapshot

# ── Minimal fake SheetsClient ────────────────────────────────────────────────

class FakeSheetsForAnalytics:
    def __init__(self):
        self.applications: list[Application] = []
        self.activities: list[Activity] = []
        self.snapshots: list[DailySnapshot] = []
        self.saved_snapshots: list[DailySnapshot] = []

    def list_applications(self, **_) -> list[Application]:
        return self.applications

    def list_activity(self, _date) -> list[Activity]:
        return self.activities

    def list_daily_snapshots(self) -> list[DailySnapshot]:
        return self.snapshots

    def save_daily_snapshot(self, snapshot: DailySnapshot) -> None:
        self.saved_snapshots.append(snapshot)


def _make_client(fake: FakeSheetsForAnalytics) -> TestClient:
    app = FastAPI()
    app.state.sheets = fake
    app.include_router(analytics_router)
    return TestClient(app)


# ── Tests ────────────────────────────────────────────────────────────────────

def test_take_daily_snapshot_computes_correct_totals():
    fake = FakeSheetsForAnalytics()
    # 2 applied, 1 in progress, 1 rejected
    from uuid import uuid4
    from datetime import datetime
    
    def _app(status: str) -> Application:
        return Application(
            id=str(uuid4()), date_applied="2026-08-01", company="A", 
            job_title="E", status=status, stage="Applied"
        )
        
    app1 = _app("Not Contacted")
    app2 = _app("Not Contacted")
    app3 = _app("In Progress")
    app4 = _app("Rejected")
    
    fake.applications = [app1, app2, app3, app4]
    
    # 1 call connected for app3
    fake.activities = [
        Activity(id="1", timestamp=datetime.now(), application_id=app3.id, company="A", action_type="Call Connected", notes="")
    ]
    
    # Run snapshot
    snapshot = take_daily_snapshot(fake, today=date(2026, 8, 5))
    
    assert snapshot.total_applications == 4
    assert snapshot.not_contacted == 2
    assert snapshot.in_progress == 1
    assert snapshot.rejected == 1
    
    # Response rate: 1 contacted_and_responded out of 2 contacted apps = 50.0
    assert snapshot.response_rate == 50.0
    
    assert snapshot.calls_connected == 1
    assert snapshot.calls_dialed == 0
    
    assert len(fake.saved_snapshots) == 1


def test_get_analytics_overview_computes_deltas():
    fake = FakeSheetsForAnalytics()
    
    today = date(2026, 8, 10)
    past = today - timedelta(days=7)
    
    # Insert a past snapshot
    fake.snapshots = [
        DailySnapshot(
            date=past,
            total_applications=10,
            not_contacted=5,
            in_progress=2,
            interviewing=1,
            offer_received=1,
            rejected=1,
            ghosted=0,
            response_rate=20.0,
            calls_dialed=5,
            calls_connected=2,
            interviews_attended=1
        )
    ]
    
    # The current state will be evaluated dynamically in the route by take_daily_snapshot.
    # We will mock the application data so it produces higher numbers.
    from uuid import uuid4
    def _app(status: str) -> Application:
        return Application(
            id=str(uuid4()), date_applied="2026-08-01", company="A", 
            job_title="E", status=status, stage="Applied"
        )
    
    # 15 total apps
    fake.applications = [_app("Not Contacted") for _ in range(15)]
    
    client = _make_client(fake)
    
    # We need to mock the `today` date for take_daily_snapshot inside the route, 
    # but since it's hard to mock without monkeypatch, we just rely on it using actual today,
    # and adjust our past date relative to actual today.
    
    actual_today = date.today()
    actual_past = actual_today - timedelta(days=7)
    fake.snapshots[0].date = actual_past
    
    resp = client.get("/analytics/overview?range=7d")
    assert resp.status_code == 200
    data = resp.json()
    
    # current applications = 15. Past = 10. Delta = ((15-10)/10)*100 = 50.0%
    assert data["current"]["total_applications"] == 15
    assert data["deltas"]["total_applications"] == 50.0


def test_post_snapshot_triggers_write():
    fake = FakeSheetsForAnalytics()
    client = _make_client(fake)
    
    resp = client.post("/analytics/snapshot")
    assert resp.status_code == 200
    assert len(fake.saved_snapshots) == 1
