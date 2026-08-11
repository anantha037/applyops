"""SQLModel table definitions for ApplyOps — corrected schema (SPEC §10).

Seven tables:
    contacts, resumes, applications, activity_log,
    calendar_events, daily_snapshots, settings

Key structural decisions:
- contacts and resumes are created first (no foreign deps).
- applications.contact_id → contacts.id  (nullable)
- applications.resume_id  → resumes.id   (nullable)
- activity_log.contact_id → contacts.id  (nullable, denormalised)
- applications does NOT contain hr_name / hr_phone / hr_email.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from enum import StrEnum
from typing import Optional

from sqlmodel import Field, SQLModel


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _new_uuid() -> str:
    return str(uuid.uuid4())


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Enums (mirrored from backend/models.py so the DB layer is self-contained)
# ---------------------------------------------------------------------------

class ApplicationStatus(StrEnum):
    NOT_CONTACTED  = "Not Contacted"
    IN_PROGRESS    = "In Progress"
    INTERVIEWING   = "Interviewing"
    OFFER_RECEIVED = "Offer Received"
    REJECTED       = "Rejected"
    GHOSTED        = "Ghosted"


class ApplicationStage(StrEnum):
    APPLIED     = "Applied"
    CALLED      = "Called"
    EMAILED     = "Emailed"
    FOLLOW_UP_1 = "Follow-up 1"
    FOLLOW_UP_2 = "Follow-up 2"
    FOLLOW_UP_3 = "Follow-up 3"
    CLOSED      = "Closed"


class ApplicationMethod(StrEnum):
    LINKEDIN_EASY_APPLY = "LinkedIn Easy Apply"
    COMPANY_WEBSITE     = "Company Website"
    INDEED              = "Indeed"
    EMAIL               = "Email"
    REFERRAL            = "Referral"
    COLD_CALL           = "Cold Call"
    OTHER               = "Other"


class ActivityActionType(StrEnum):
    CALL_DIALED          = "Call Dialed"
    CALL_CONNECTED       = "Call Connected"
    EMAIL_SENT           = "Email Sent"
    WHATSAPP_SENT        = "WhatsApp Sent"
    INTERVIEW_COMPLETED  = "Interview Completed"


class CalendarEventType(StrEnum):
    FOLLOW_UP            = "Follow-up"
    INTERVIEW            = "Interview"
    APPLICATION_DEADLINE = "Application Deadline"
    REMINDER             = "Reminder"
    PERSONAL             = "Personal"


class CalendarEventSource(StrEnum):
    AUTO   = "Auto"
    MANUAL = "Manual"


class ContactTag(StrEnum):
    RECRUITER    = "Recruiter"
    HR_MANAGER   = "HR Manager"
    REFERRER     = "Referrer"
    OTHER        = "Other"


# ---------------------------------------------------------------------------
# contacts
# ---------------------------------------------------------------------------

class Contact(SQLModel, table=True):
    """HR / recruiter contact.  Single source of truth — never duplicated."""

    __tablename__ = "contacts"

    id:         str           = Field(default_factory=_new_uuid, primary_key=True)
    name:       str
    company:    Optional[str] = Field(default=None)
    role:       Optional[str] = Field(default=None)
    email:      Optional[str] = Field(default=None)
    phone:      Optional[str] = Field(default=None)
    tags:       Optional[str] = Field(default=None)   # ContactTag value
    notes:      Optional[str] = Field(default=None)
    created_at: datetime      = Field(default_factory=_utc_now)


# ---------------------------------------------------------------------------
# resumes
# ---------------------------------------------------------------------------

class Resume(SQLModel, table=True):
    """Metadata for a resume PDF stored in Cloudflare R2."""

    __tablename__ = "resumes"

    id:          str           = Field(default_factory=_new_uuid, primary_key=True)
    filename:    str                                            # original uploaded filename
    storage_key: str                                            # object key in R2 — never a public URL
    label:       Optional[str] = Field(default=None)           # e.g. "AI/ML Generalist v2"
    uploaded_at: datetime      = Field(default_factory=_utc_now)


# ---------------------------------------------------------------------------
# applications
# ---------------------------------------------------------------------------

class Application(SQLModel, table=True):
    """One job application.

    Structural changes vs the old Sheets design (SPEC §10):
    - contact_id replaces hr_name / hr_phone / hr_email.
    - resume_id  references the resumes table.
    """

    __tablename__ = "applications"

    id:                  str                         = Field(default_factory=_new_uuid, primary_key=True)
    date_applied:        date                        = Field(default_factory=date.today)
    company:             str
    job_title:           str
    jd_summary:          Optional[str]               = Field(default=None)
    application_method:  Optional[str]               = Field(default=None)  # ApplicationMethod value

    # Foreign keys (both nullable — contact and resume are always optional)
    contact_id:          Optional[str]               = Field(default=None, foreign_key="contacts.id")
    resume_id:           Optional[str]               = Field(default=None, foreign_key="resumes.id")

    ctc:                 Optional[str]               = Field(default=None)
    status:              str                         = Field(default=ApplicationStatus.NOT_CONTACTED)
    stage:               str                         = Field(default=ApplicationStage.APPLIED)
    last_touch_date:     Optional[date]              = Field(default=None)
    next_action_due:     Optional[date]              = Field(default=None)
    interview_date:      Optional[date]              = Field(default=None)
    interview_round:     Optional[str]               = Field(default=None)
    interview_attended:  Optional[bool]              = Field(default=None)
    latest_update:       Optional[str]               = Field(default=None)
    remarks:             Optional[str]               = Field(default=None)


# ---------------------------------------------------------------------------
# activity_log
# ---------------------------------------------------------------------------

class ActivityLog(SQLModel, table=True):
    """One action event (call, email, interview, …) linked to an application."""

    __tablename__ = "activity_log"

    id:             str           = Field(default_factory=_new_uuid, primary_key=True)
    timestamp:      datetime      = Field(default_factory=_utc_now)
    application_id: Optional[str] = Field(default=None, foreign_key="applications.id")
    company:        Optional[str] = Field(default=None)          # denormalised for easy reading
    action_type:    str                                          # ActivityActionType value

    # Denormalised from applications.contact_id — see SPEC §10 note
    contact_id:     Optional[str] = Field(default=None, foreign_key="contacts.id")

    notes:          Optional[str] = Field(default=None)


# ---------------------------------------------------------------------------
# calendar_events
# ---------------------------------------------------------------------------

class CalendarEvent(SQLModel, table=True):
    """A calendar event — auto-generated from next_action_due / interview_date,
    or created manually."""

    __tablename__ = "calendar_events"

    id:                     str           = Field(default_factory=_new_uuid, primary_key=True)
    title:                  str
    event_type:             str                                   # CalendarEventType value
    event_date:             date                                  # `date` is a reserved word in SQL
    time:                   Optional[str] = Field(default=None)  # e.g. "10:30 AM"
    related_application_id: Optional[str] = Field(default=None, foreign_key="applications.id")
    notes:                  Optional[str] = Field(default=None)
    source:                 str           = Field(default=CalendarEventSource.MANUAL)


# ---------------------------------------------------------------------------
# daily_snapshots
# ---------------------------------------------------------------------------

class DailySnapshot(SQLModel, table=True):
    """One row per calendar day — written by the nightly scheduler job.
    Powers /analytics/overview trend comparisons without full-table scans."""

    __tablename__ = "daily_snapshots"

    id:                  str      = Field(default_factory=_new_uuid, primary_key=True)
    snapshot_date:       date     = Field(unique=True)           # one row per day, enforced
    total_applications:  int      = Field(default=0)
    not_contacted:       int      = Field(default=0)
    in_progress:         int      = Field(default=0)
    interviewing:        int      = Field(default=0)
    offer_received:      int      = Field(default=0)
    rejected:            int      = Field(default=0)
    ghosted:             int      = Field(default=0)
    response_rate:       float    = Field(default=0.0)
    calls_dialed:        int      = Field(default=0)
    calls_connected:     int      = Field(default=0)
    interviews_attended: int      = Field(default=0)


# ---------------------------------------------------------------------------
# settings
# ---------------------------------------------------------------------------

class Settings(SQLModel, table=True):
    """Single-row config table (single-user app — always id=1)."""

    __tablename__ = "settings"

    id:                   int     = Field(default=1, primary_key=True)
    daily_goal:           int     = Field(default=0)
    working_hours_start:  str     = Field(default="09:00")
    working_hours_end:    str     = Field(default="18:00")
    telegram_chat_id:     str     = Field(default="")
    dashboard_pin:        str     = Field(default="")
