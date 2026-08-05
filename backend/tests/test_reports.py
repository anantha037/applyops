"""
Tests for Reports API CSV Export.
"""

from __future__ import annotations

import csv
import io
from datetime import datetime
from uuid import uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.models import Application, Activity
from backend.routes.reports import router as reports_router


class FakeSheetsForReports:
    def __init__(self):
        self.applications = []
        self.activities = []

    def list_applications(self, **_) -> list[Application]:
        return self.applications

    def list_activity(self, _date=None) -> list[Activity]:
        return self.activities


def _make_client(fake: FakeSheetsForReports) -> TestClient:
    app = FastAPI()
    app.state.sheets = fake
    app.include_router(reports_router)
    return TestClient(app)


def test_export_applications_csv():
    fake = FakeSheetsForReports()
    fake.applications = [
        Application(id="A1", date_applied="2026-08-01", company="CorpA", job_title="Engineer", status="Not Contacted", stage="Applied"),
        Application(id="A2", date_applied="2026-08-10", company="CorpB", job_title="Designer", status="In Progress", stage="Applied"),
    ]
    
    client = _make_client(fake)
    
    resp = client.get("/reports/export?type=applications")
    assert resp.status_code == 200
    assert resp.headers["Content-Type"] == "text/csv; charset=utf-8"
    assert "attachment; filename=applyops_export_applications" in resp.headers["Content-Disposition"]
    
    text = resp.text
    reader = csv.reader(io.StringIO(text))
    rows = list(reader)
    
    assert len(rows) == 3 # 1 header, 2 data
    assert rows[0][0] == "ID"
    assert rows[1][0] == "A1"
    assert rows[1][2] == "CorpA"
    assert rows[2][0] == "A2"


def test_export_activity_csv_with_date_filter():
    fake = FakeSheetsForReports()
    fake.activities = [
        Activity(id="Act1", timestamp=datetime.fromisoformat("2026-08-01T10:00:00"), application_id="A1", company="CorpA", action_type="Call Dialed", notes=""),
        Activity(id="Act2", timestamp=datetime.fromisoformat("2026-08-05T12:00:00"), application_id="A1", company="CorpA", action_type="Call Connected", notes=""),
        Activity(id="Act3", timestamp=datetime.fromisoformat("2026-08-15T10:00:00"), application_id="A2", company="CorpB", action_type="Email Sent", notes=""),
    ]
    
    client = _make_client(fake)
    
    # Filter only first 10 days of August
    resp = client.get("/reports/export?type=activity&start=2026-08-01&end=2026-08-10")
    assert resp.status_code == 200
    
    reader = csv.reader(io.StringIO(resp.text))
    rows = list(reader)
    
    assert len(rows) == 3 # 1 header, 2 data (Act1 and Act2)
    assert rows[1][0] == "Act1"
    assert rows[2][0] == "Act2"


def test_export_full_csv_joins_app_and_activity():
    fake = FakeSheetsForReports()
    fake.applications = [
        Application(id="A1", date_applied="2026-08-01", company="CorpA", job_title="Engineer", status="Not Contacted", stage="Applied"),
        Application(id="A2", date_applied="2026-08-02", company="CorpB", job_title="Designer", status="In Progress", stage="Applied"),
    ]
    fake.activities = [
        Activity(id="Act1", timestamp=datetime.fromisoformat("2026-08-03T10:00:00"), application_id="A1", company="CorpA", action_type="Call Connected", notes="Nice chat")
    ]
    
    client = _make_client(fake)
    
    resp = client.get("/reports/export?type=full")
    assert resp.status_code == 200
    
    reader = csv.reader(io.StringIO(resp.text))
    rows = list(reader)
    
    assert len(rows) == 3 # 1 header, A1 with Act1, A2 with no activity
    # Headers check
    assert rows[0] == ["Application ID", "Date Applied", "App Company", "Job Title", "Status", "Stage", "Activity ID", "Activity Timestamp", "Action Type", "Activity Notes"]
    
    # A1 row
    assert rows[1][0] == "A1"
    assert rows[1][2] == "CorpA"
    assert rows[1][6] == "Act1"
    assert rows[1][8] == "Call Connected"
    
    # A2 row (no activity)
    assert rows[2][0] == "A2"
    assert rows[2][2] == "CorpB"
    assert rows[2][6] == "" # Empty activity ID
