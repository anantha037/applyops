"""
Tests for Calendar Events auto-sync logic.

Key guarantee: no matter how many times an application's stage changes,
exactly ONE Auto Follow-up calendar event exists for it at any point —
never a growing pile of duplicates. When the stage reaches a terminal
stage (next_action_due → None), the event is removed.
"""

from __future__ import annotations

from datetime import date
from typing import Any
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.models import (
    Activity,
    ActivityCreate,
    Application,
    CalendarEvent,
    CalendarEventCreate,
    CalendarEventSource,
    CalendarEventType,
)
from backend.routes.applications import router as applications_router
from backend.routes.calendar import router as calendar_router


# ── In-memory fake SheetsClient ──────────────────────────────────────────────

class FakeSheetsClient:
    """Minimal in-memory implementation of every SheetsClient method used
    by the applications and calendar routes under test."""

    def __init__(self) -> None:
        self.applications:    dict[str, Application]  = {}
        self.calendar_events: dict[str, CalendarEvent] = {}
        self.activities:      list[Activity]           = []

    # ── Application methods ───────────────────────────────────────────────

    def list_applications(self, status=None, stage=None) -> list[Application]:
        return [
            a for a in self.applications.values()
            if (status is None or a.status == status)
            and (stage  is None or a.stage  == stage)
        ]

    def create_application(self, app: Application) -> Application:
        self.applications[app.id] = app
        return app

    def get_application(self, app_id: str) -> Application | None:
        return self.applications.get(app_id)

    def update_application(self, app: Application) -> Application | None:
        if app.id not in self.applications:
            return None
        self.applications[app.id] = app
        return app

    def delete_application(self, app_id: str) -> bool:
        return self.applications.pop(app_id, None) is not None

    # ── Activity methods ──────────────────────────────────────────────────

    def create_activity(self, activity_id: str, payload: ActivityCreate) -> Activity:
        act = Activity(
            id=activity_id,
            timestamp="2026-08-05T12:00:00+00:00",
            **payload.model_dump(),
        )
        self.activities.append(act)
        return act

    def list_activity(self, _date=None) -> list[Activity]:
        return self.activities

    # ── Calendar Event methods ────────────────────────────────────────────

    def list_calendar_events(
        self,
        start: date | None = None,
        end:   date | None = None,
    ) -> list[CalendarEvent]:
        result = list(self.calendar_events.values())
        if start:
            result = [e for e in result if e.date >= start]
        if end:
            result = [e for e in result if e.date <= end]
        return result

    def create_calendar_event(self, event: CalendarEvent) -> CalendarEvent:
        self.calendar_events[event.id] = event
        return event

    def get_calendar_event(self, event_id: str) -> CalendarEvent | None:
        return self.calendar_events.get(event_id)

    def update_calendar_event(self, event: CalendarEvent) -> CalendarEvent | None:
        if event.id not in self.calendar_events:
            return None
        self.calendar_events[event.id] = event
        return event

    def delete_calendar_event(self, event_id: str) -> bool:
        return self.calendar_events.pop(event_id, None) is not None

    # ── Auto-sync helpers (delegated to real logic via mixin) ─────────────

    def _find_auto_event(
        self,
        related_application_id: str,
        event_type: CalendarEventType,
    ) -> CalendarEvent | None:
        for ev in self.calendar_events.values():
            if (
                ev.related_application_id == related_application_id
                and ev.event_type == event_type
                and ev.source == CalendarEventSource.AUTO
            ):
                return ev
        return None

    def sync_followup_event(
        self,
        application_id: str,
        company: str,
        next_action_due: date | None,
        event_id_factory: Any,
    ) -> None:
        existing = self._find_auto_event(application_id, CalendarEventType.FOLLOW_UP)
        if next_action_due is None:
            if existing:
                self.delete_calendar_event(existing.id)
            return
        if existing:
            updated = existing.model_copy(
                update={"date": next_action_due, "title": f"{company} – Follow-up"}
            )
            self.update_calendar_event(updated)
        else:
            self.create_calendar_event(CalendarEvent(
                id=event_id_factory(),
                title=f"{company} – Follow-up",
                event_type=CalendarEventType.FOLLOW_UP,
                date=next_action_due,
                time=None,
                related_application_id=application_id,
                notes="",
                source=CalendarEventSource.AUTO,
            ))

    def sync_interview_event(
        self,
        application_id: str,
        company: str,
        interview_date: date | None,
        interview_round: str,
        event_id_factory: Any,
    ) -> None:
        existing = self._find_auto_event(application_id, CalendarEventType.INTERVIEW)
        if interview_date is None:
            if existing:
                self.delete_calendar_event(existing.id)
            return
        title = f"{company} – {interview_round or 'Interview'}"
        if existing:
            self.update_calendar_event(
                existing.model_copy(update={"date": interview_date, "title": title})
            )
        else:
            self.create_calendar_event(CalendarEvent(
                id=event_id_factory(),
                title=title,
                event_type=CalendarEventType.INTERVIEW,
                date=interview_date,
                time=None,
                related_application_id=application_id,
                notes="",
                source=CalendarEventSource.AUTO,
            ))


# ── Test helpers ──────────────────────────────────────────────────────────────

def _make_app() -> tuple[TestClient, FakeSheetsClient]:
    fake = FakeSheetsClient()
    app = FastAPI()
    app.state.sheets = fake
    app.include_router(applications_router)
    app.include_router(calendar_router)
    return TestClient(app), fake


def _auto_followup_events(fake: FakeSheetsClient, app_id: str) -> list[CalendarEvent]:
    return [
        ev for ev in fake.calendar_events.values()
        if ev.related_application_id == app_id
        and ev.event_type == CalendarEventType.FOLLOW_UP
        and ev.source == CalendarEventSource.AUTO
    ]


# ── Tests ─────────────────────────────────────────────────────────────────────

def test_create_application_produces_exactly_one_followup_event() -> None:
    """Creating an application must produce exactly one auto Follow-up event."""
    client, fake = _make_app()

    resp = client.post("/applications", json={"company": "Acme", "job_title": "Engineer"})
    assert resp.status_code == 201
    app_id = resp.json()["id"]

    followups = _auto_followup_events(fake, app_id)
    assert len(followups) == 1, f"Expected 1 follow-up event, got {len(followups)}"
    assert followups[0].date is not None


def test_multiple_stage_changes_keep_exactly_one_followup_event() -> None:
    """Core no-duplicate guarantee: patching stage multiple times must never
    accumulate more than one Auto Follow-up event for the same application."""
    client, fake = _make_app()

    create_resp = client.post(
        "/applications",
        json={"company": "Globex", "job_title": "Dev", "last_touch_date": "2026-08-01"},
    )
    assert create_resp.status_code == 201
    app_id = create_resp.json()["id"]

    stage_changes = [
        {"stage": "Called",       "last_touch_date": "2026-08-03"},
        {"stage": "Follow-up 1",  "last_touch_date": "2026-08-06"},
        {"stage": "Follow-up 2",  "last_touch_date": "2026-08-11"},
    ]

    for patch_body in stage_changes:
        resp = client.patch(f"/applications/{app_id}", json=patch_body)
        assert resp.status_code == 200

        followups = _auto_followup_events(fake, app_id)
        assert len(followups) == 1, (
            f"After patching to {patch_body['stage']}: "
            f"expected exactly 1 follow-up event, got {len(followups)}"
        )


def test_terminal_stage_removes_followup_event() -> None:
    """Advancing to a terminal stage (next_action_due → None) must delete
    the auto Follow-up event, not leave it dangling."""
    client, fake = _make_app()

    create_resp = client.post(
        "/applications",
        json={"company": "Initech", "job_title": "BA", "last_touch_date": "2026-08-01"},
    )
    app_id = create_resp.json()["id"]

    # Confirm an event was created
    assert len(_auto_followup_events(fake, app_id)) == 1

    # Advance to a terminal stage
    resp = client.patch(f"/applications/{app_id}", json={"stage": "Follow-up 3"})
    assert resp.status_code == 200
    assert resp.json()["next_action_due"] is None

    followups = _auto_followup_events(fake, app_id)
    assert len(followups) == 0, (
        f"Expected 0 follow-up events after terminal stage, got {len(followups)}"
    )


def test_manual_event_unaffected_by_application_changes() -> None:
    """A manually-created Personal event must survive all application PATCH calls
    and must never be touched by the auto-sync logic."""
    client, fake = _make_app()

    # Create a manual Personal event
    manual_resp = client.post("/calendar/events", json={
        "title": "Coffee chat",
        "event_type": "Personal",
        "date": "2026-08-10",
        "notes": "Meet John",
    })
    assert manual_resp.status_code == 201
    manual_id = manual_resp.json()["id"]

    # Create an application (triggers auto-sync)
    app_resp = client.post(
        "/applications",
        json={"company": "Umbrella", "job_title": "Analyst", "last_touch_date": "2026-08-01"},
    )
    app_id = app_resp.json()["id"]

    # Patch the application several times
    for patch_body in [
        {"stage": "Called",      "last_touch_date": "2026-08-03"},
        {"stage": "Follow-up 1", "last_touch_date": "2026-08-06"},
        {"stage": "Follow-up 3"},   # terminal → auto event deleted
    ]:
        client.patch(f"/applications/{app_id}", json=patch_body)

    # Manual event must still exist, unchanged
    assert manual_id in fake.calendar_events, "Manual event was deleted by auto-sync — bug!"
    surviving = fake.calendar_events[manual_id]
    assert surviving.title == "Coffee chat"
    assert surviving.source == CalendarEventSource.MANUAL


def test_calendar_crud_endpoints() -> None:
    """GET, POST, PATCH, DELETE via the /calendar/events API."""
    client, fake = _make_app()

    # POST
    resp = client.post("/calendar/events", json={
        "title": "HR Call",
        "event_type": "Reminder",
        "date": "2026-08-15",
        "notes": "Call at noon",
    })
    assert resp.status_code == 201
    ev_id = resp.json()["id"]
    assert resp.json()["source"] == "Manual"

    # GET all
    all_resp = client.get("/calendar/events")
    assert all_resp.status_code == 200
    assert any(e["id"] == ev_id for e in all_resp.json())

    # GET with date range — event should appear
    in_range = client.get("/calendar/events?start=2026-08-14&end=2026-08-16")
    assert any(e["id"] == ev_id for e in in_range.json())

    # GET with exclusive date range — event should NOT appear
    out_range = client.get("/calendar/events?start=2026-08-01&end=2026-08-10")
    assert not any(e["id"] == ev_id for e in out_range.json())

    # PATCH
    patch_resp = client.patch(f"/calendar/events/{ev_id}", json={"title": "Updated Call"})
    assert patch_resp.status_code == 200
    assert patch_resp.json()["title"] == "Updated Call"

    # DELETE
    del_resp = client.delete(f"/calendar/events/{ev_id}")
    assert del_resp.status_code == 204

    # Confirm gone
    assert ev_id not in fake.calendar_events

    # DELETE non-existent → 404
    assert client.delete(f"/calendar/events/{ev_id}").status_code == 404
