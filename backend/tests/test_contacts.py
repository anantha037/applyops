"""
Tests for GET /contacts merge and deduplication logic.

Key guarantees verified:
1. An application with HR fields produces one contact with source="application".
2. A Contacts_Manual entry with a different email appears as source="manual".
3. A Contacts_Manual entry whose email matches an application HR record is
   merged into a single result — source="both", no duplicate.
4. Activity Log "Call Connected" sets responded=True and last_contacted on that contact.
5. Adding a manual contact with a matching email to an existing application
   contact yields exactly one entry in the merged list, not two.
6. Contacts with no email in either source are never accidentally merged.
"""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.models import (
    Activity,
    ActivityCreate,
    Application,
    ContactManual,
    ContactView,
)
from backend.routes.contacts import router as contacts_router


# ── Helpers ───────────────────────────────────────────────────────────────────

def _app_id() -> str:
    return str(uuid4())


def _make_app(
    hr_name: str = "",
    hr_email: str = "",
    hr_phone: str = "",
    company: str = "Acme",
) -> Application:
    return Application(
        id=_app_id(),
        date_applied="2026-08-01",
        company=company,
        job_title="Engineer",
        hr_name=hr_name,
        hr_email=hr_email,
        hr_phone=hr_phone,
        status="In Progress",
        stage="Applied",
    )


def _make_activity(app_id: str, action_type: str, ts_str: str = "2026-08-05T10:00:00+00:00") -> Activity:
    return Activity(
        id=str(uuid4()),
        timestamp=datetime.fromisoformat(ts_str),
        application_id=app_id,
        company="Acme",
        action_type=action_type,
        notes="",
    )


# ── Minimal fake SheetsClient for contacts ───────────────────────────────────

class FakeSheetsForContacts:
    def __init__(
        self,
        applications: list[Application] | None = None,
        activities:   list[Activity]    | None = None,
        contacts:     list[ContactManual] | None = None,
    ) -> None:
        self._apps       = applications or []
        self._activities = activities   or []
        self._contacts   = contacts     or []

    def list_applications(self, **_) -> list[Application]:
        return self._apps

    def list_activity(self, _date=None) -> list[Activity]:
        return self._activities

    def list_contacts_manual(self) -> list[ContactManual]:
        return self._contacts

    def create_contact_manual(self, contact: ContactManual) -> ContactManual:
        self._contacts.append(contact)
        return contact

    # Delegate merge logic to the real implementation
    def get_contacts_merged(self) -> list[ContactView]:
        from backend.sheets_client import SheetsClient
        return SheetsClient.get_contacts_merged(self)  # type: ignore[arg-type]


def _make_client(fake: FakeSheetsForContacts) -> TestClient:
    app = FastAPI()
    app.state.sheets = fake
    app.include_router(contacts_router)
    return TestClient(app)


# ── Tests ─────────────────────────────────────────────────────────────────────

def test_application_hr_produces_one_contact() -> None:
    app = _make_app(hr_name="Priya", hr_email="priya@tcs.com", company="TCS")
    fake = FakeSheetsForContacts(applications=[app])
    client = _make_client(fake)

    resp = client.get("/contacts")
    assert resp.status_code == 200
    contacts = resp.json()
    assert len(contacts) == 1
    c = contacts[0]
    assert c["name"] == "Priya"
    assert c["email"] == "priya@tcs.com"
    assert c["source"] == "application"
    assert c["application_id"] == app.id
    assert c["responded"] is False


def test_manual_contact_different_email_appears_as_manual() -> None:
    manual = ContactManual(id=str(uuid4()), name="John", email="john@example.com")
    fake = FakeSheetsForContacts(contacts=[manual])
    client = _make_client(fake)

    resp = client.get("/contacts")
    assert resp.status_code == 200
    contacts = resp.json()
    assert len(contacts) == 1
    assert contacts[0]["source"] == "manual"
    assert contacts[0]["name"] == "John"


def test_manual_contact_matching_email_merges_no_duplicate() -> None:
    """Core dedup guarantee: same email in both sources → exactly 1 result, source='both'."""
    shared_email = "hr@globex.com"
    app = _make_app(hr_name="Jane", hr_email=shared_email, company="Globex")
    manual = ContactManual(
        id=str(uuid4()), name="Jane Smith",
        email=shared_email, tags="Recruiter",
    )
    fake = FakeSheetsForContacts(applications=[app], contacts=[manual])
    client = _make_client(fake)

    resp = client.get("/contacts")
    assert resp.status_code == 200
    contacts = resp.json()

    # Exactly one contact — not two
    assert len(contacts) == 1, f"Expected 1 merged contact, got {len(contacts)}"
    c = contacts[0]
    assert c["source"] == "both"
    assert c["email"] == shared_email
    # Tags enriched from manual side
    assert c["tags"] == "Recruiter"
    # application_id still carried through
    assert c["application_id"] == app.id


def test_responded_flag_set_by_call_connected() -> None:
    app = _make_app(hr_name="Ram", hr_email="ram@infosys.com", company="Infosys")
    activity = _make_activity(app.id, "Call Connected", "2026-08-05T09:30:00+00:00")
    fake = FakeSheetsForContacts(applications=[app], activities=[activity])
    client = _make_client(fake)

    contacts = client.get("/contacts").json()
    assert len(contacts) == 1
    c = contacts[0]
    assert c["responded"] is True
    assert c["last_contacted"] == "2026-08-05"


def test_responded_flag_set_by_interview_completed() -> None:
    app = _make_app(hr_name="Sita", hr_email="sita@wipro.com", company="Wipro")
    activity = _make_activity(app.id, "Interview Completed", "2026-08-04T14:00:00+00:00")
    fake = FakeSheetsForContacts(applications=[app], activities=[activity])

    contacts = FakeSheetsForContacts.get_contacts_merged(fake)
    assert contacts[0].responded is True


def test_call_dialed_alone_does_not_set_responded() -> None:
    app = _make_app(hr_name="Dev", hr_email="dev@hcl.com", company="HCL")
    activity = _make_activity(app.id, "Call Dialed")
    fake = FakeSheetsForContacts(applications=[app], activities=[activity])

    contacts = FakeSheetsForContacts.get_contacts_merged(fake)
    assert contacts[0].responded is False


def test_no_email_contacts_not_merged_together() -> None:
    """Two HR contacts with no email (from different applications) must NOT be merged."""
    app1 = _make_app(hr_name="Alice", hr_email="", company="A Corp")
    app2 = _make_app(hr_name="Bob",   hr_email="", company="B Corp")
    fake = FakeSheetsForContacts(applications=[app1, app2])

    contacts = FakeSheetsForContacts.get_contacts_merged(fake)
    assert len(contacts) == 2, "Two no-email contacts must remain separate"
    names = {c.name for c in contacts}
    assert names == {"Alice", "Bob"}


def test_application_with_no_hr_info_excluded() -> None:
    """Applications with no HR name, email, or phone must not appear in contacts."""
    app = _make_app(hr_name="", hr_email="", hr_phone="")
    fake = FakeSheetsForContacts(applications=[app])

    contacts = FakeSheetsForContacts.get_contacts_merged(fake)
    assert len(contacts) == 0


def test_post_contacts_creates_manual_row_via_api() -> None:
    fake = FakeSheetsForContacts()
    client = _make_client(fake)

    resp = client.post("/contacts", json={
        "name":    "Preethi",
        "company": "Cognizant",
        "email":   "preethi@cognizant.com",
        "tags":    "HR Manager",
    })
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Preethi"
    assert body["tags"] == "HR Manager"
    assert "id" in body

    # Row persisted in fake storage
    assert len(fake._contacts) == 1
    assert fake._contacts[0].email == "preethi@cognizant.com"


def test_email_case_insensitive_dedup() -> None:
    """Emails that differ only in case must be treated as the same contact."""
    app    = _make_app(hr_name="Anita", hr_email="Anita@Corp.COM", company="Corp")
    manual = ContactManual(id=str(uuid4()), name="Anita Sharma", email="anita@corp.com", tags="Recruiter")
    fake   = FakeSheetsForContacts(applications=[app], contacts=[manual])

    contacts = FakeSheetsForContacts.get_contacts_merged(fake)
    assert len(contacts) == 1
    assert contacts[0].source == "both"


def test_multiple_activities_last_contacted_is_latest() -> None:
    """last_contacted should reflect the latest activity, not the first."""
    app = _make_app(hr_name="Raj", hr_email="raj@tcs.com", company="TCS")
    early  = _make_activity(app.id, "Call Dialed",   "2026-08-01T09:00:00+00:00")
    middle = _make_activity(app.id, "Call Connected","2026-08-03T11:00:00+00:00")
    late   = _make_activity(app.id, "Email Sent",    "2026-08-05T15:00:00+00:00")
    fake   = FakeSheetsForContacts(applications=[app], activities=[early, middle, late])

    contacts = FakeSheetsForContacts.get_contacts_merged(fake)
    assert contacts[0].last_contacted == "2026-08-05"
    assert contacts[0].responded is True   # Call Connected was logged
