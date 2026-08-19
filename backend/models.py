"""Schemas and shared business rules for ApplyOps applications."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field


class CalendarEventType(StrEnum):
    FOLLOW_UP            = "Follow-up"
    INTERVIEW            = "Interview"
    APPLICATION_DEADLINE = "Application Deadline"
    REMINDER             = "Reminder"
    PERSONAL             = "Personal"


class CalendarEventSource(StrEnum):
    AUTO   = "Auto"
    MANUAL = "Manual"


class CalendarEventCreate(BaseModel):
    """Payload for a new calendar event (manual creation only)."""
    title:                  str
    event_type:             CalendarEventType
    date:                   date
    time:                   str | None = None
    related_application_id: str | None = None
    notes:                  str        = ""
    source:                 CalendarEventSource = CalendarEventSource.MANUAL


class CalendarEventUpdate(BaseModel):
    """Partial update payload for a calendar event."""
    title:      str | None = None
    event_type: CalendarEventType | None = None
    event_date: date | None = None   # renamed from `date` to avoid shadowing the type
    time:       str  | None = None
    notes:      str  | None = None


class CalendarEvent(CalendarEventCreate):
    """Persisted calendar event record."""
    id: str


class ApplicationStatus(StrEnum):
    NOT_CONTACTED = "Not Contacted"
    IN_PROGRESS = "In Progress"
    INTERVIEWING = "Interviewing"
    OFFER_RECEIVED = "Offer Received"
    REJECTED = "Rejected"
    GHOSTED = "Ghosted"


class ApplicationStage(StrEnum):
    APPLIED = "Applied"
    CALLED = "Called"
    EMAILED = "Emailed"
    FOLLOW_UP_1 = "Follow-up 1"
    FOLLOW_UP_2 = "Follow-up 2"
    FOLLOW_UP_3 = "Follow-up 3"
    CLOSED = "Closed"


class ContactStatus(StrEnum):
    NOT_CONTACTED = "Not Contacted"
    OUTREACH_SENT = "Outreach Sent"
    IN_CONVERSATION = "In Conversation"
    MEETING_SCHEDULED = "Meeting Scheduled"
    REFERRAL_SECURED = "Referral Secured"
    INTERVIEWING = "Interviewing"
    GHOSTED = "Ghosted"
    NOT_INTERESTED = "Not Interested"
    CLOSED = "Closed"


FOLLOW_UP_DELAYS: dict[ApplicationStage, int] = {
    ApplicationStage.APPLIED: 2,
    ApplicationStage.CALLED: 3,
    ApplicationStage.FOLLOW_UP_1: 5,
    ApplicationStage.FOLLOW_UP_2: 5,
}


def calculate_next_action_due(
    stage: ApplicationStage,
    last_touch_date: date | None,
    application_status: ApplicationStatus | str | None = None,
) -> date | None:
    """Return the next follow-up date, or None for terminal applications."""
    if last_touch_date is None:
        return None
    if application_status in {
        ApplicationStatus.OFFER_RECEIVED,
        ApplicationStatus.REJECTED,
    }:
        return None
    delay = FOLLOW_UP_DELAYS.get(stage)
    return last_touch_date + timedelta(days=delay) if delay is not None else None


class ApplicationFields(BaseModel):
    """Editable application data, matching the Applications worksheet columns."""

    model_config = ConfigDict(use_enum_values=True)

    date_applied: date = Field(default_factory=date.today)
    company: Annotated[str, Field(min_length=1)]
    job_title: Annotated[str, Field(min_length=1)]
    jd_summary: str = ""
    location: str | None = None
    application_method: str = ""
    hr_name: str = ""
    hr_phone: str = ""
    hr_email: str = ""
    ctc: str = ""
    status: ApplicationStatus = ApplicationStatus.NOT_CONTACTED
    stage: ApplicationStage = ApplicationStage.APPLIED
    last_touch_date: date | None = None
    interview_date: date | None = None
    interview_round: str = ""
    interview_attended: bool | None = None
    latest_update: str = ""
    remarks: str = ""


class ApplicationCreate(ApplicationFields):
    """Payload for a new application."""
    contact_name: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    contact_role: str | None = None
    contact_linkedin: str | None = None
    resume_id: str | None = None


class ApplicationUpdate(BaseModel):
    """Partial payload for an existing application."""

    model_config = ConfigDict(use_enum_values=True)

    date_applied: date | None = None
    company: Annotated[str | None, Field(min_length=1)] = None
    job_title: Annotated[str | None, Field(min_length=1)] = None
    jd_summary: str | None = None
    location: str | None = None
    application_method: str | None = None
    hr_name: str | None = None
    hr_phone: str | None = None
    hr_email: str | None = None
    ctc: str | None = None
    status: ApplicationStatus | None = None
    stage: ApplicationStage | None = None
    last_touch_date: date | None = None
    interview_date: date | None = None
    interview_round: str | None = None
    interview_attended: bool | None = None
    latest_update: str | None = None
    remarks: str | None = None
    next_action_due: date | None = None
    contact_name: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    contact_role: str | None = None
    contact_linkedin: str | None = None
    resume_id: str | None = None


class Application(ApplicationFields):
    """Persisted application record."""

    id: str
    next_action_due: date | None = None
    contact_id: str | None = None
    resume_id: str | None = None


class ActivityCreate(BaseModel):
    application_id: str = ""
    company: str = ""
    action_type: Annotated[str, Field(min_length=1)]
    notes: str = ""


class Activity(BaseModel):
    id: str
    timestamp: datetime
    application_id: str
    company: str
    action_type: str
    notes: str


class DailyCoachingInput(BaseModel):
    """Structured daily metrics supplied to the coaching engine."""

    date: date
    goal: int = Field(ge=0)
    applications_logged_today: int = Field(ge=0)
    calls_made_today: int = Field(ge=0)
    responses_today: int = Field(ge=0)
    streak_days: int = Field(ge=0)
    remarks_today: list[str] = Field(default_factory=list)


class DailyFeedback(BaseModel):
    """The concise coaching message generated for one day."""

    date: date
    message: str


class Settings(BaseModel):
    daily_goal: int = Field(default=0, ge=0)
    daily_calls_goal: int = Field(default=0, ge=0)
    working_hours_start: str = ""
    working_hours_end: str = ""
    telegram_chat_id: str = ""
    dashboard_pin: str = ""
    app_reminders: bool = True
    followup_reminders: bool = True
    interview_reminders: bool = True
    daily_progress: bool = True
    streak_alerts: bool = True


class SettingsUpdate(BaseModel):
    daily_goal: int | None = Field(default=None, ge=0)
    daily_calls_goal: int | None = Field(default=None, ge=0)
    working_hours_start: str | None = None
    working_hours_end: str | None = None
    telegram_chat_id: str | None = None
    dashboard_pin: str | None = None
    app_reminders: bool | None = None
    followup_reminders: bool | None = None
    interview_reminders: bool | None = None
    daily_progress: bool | None = None
    streak_alerts: bool | None = None


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


# ── Contacts ─────────────────────────────────────────────────────────────────

class ContactCreate(BaseModel):
    """Payload for a new manual-only contact row in Contacts_Manual."""
    name:    Annotated[str, Field(min_length=1)]
    company: str = ""
    role:    str = ""
    email:   str = ""
    phone:   str = ""
    tags:    str = ""   # comma-separated: Recruiter, HR Manager, Referrer, Other
    notes:   str = ""
    linkedin_url: str = ""


class ContactManual(ContactCreate):
    """Persisted Contacts_Manual row."""
    id: str


class ContactView(BaseModel):
    """Merged/enriched contact returned by GET /contacts.

    Fields that come from Applications are populated when the contact
    was derived from an application row.  source='manual' means it came
    exclusively from Contacts_Manual (no matching application HR record).
    """
    id:                    str
    name:                  str
    company:               str = ""
    role:                  str = ""
    email:                 str = ""
    phone:                 str = ""
    tags:                  str = ""
    notes:                 str = ""
    linkedin_url:          str = ""
    source:                str          # "application" | "manual" | "both"
    application_id:        str | None = None
    last_contacted:        str | None = None  # ISO date string or None
    responded:             bool = False
    last_action_status:    str = "Not Contacted"
    last_action_date:      str | None = None  # ISO date string or None


class ContactUpdate(BaseModel):
    """Payload for updating an existing contact."""
    name:               str | None = Field(default=None, min_length=1)
    company:            str | None = None
    role:               str | None = None
    email:              str | None = None
    phone:              str | None = None
    tags:               str | None = None
    notes:              str | None = None
    linkedin_url:       str | None = None
    last_action_status: str | None = None
    last_action_date:   date | None = None


# ── Analytics ────────────────────────────────────────────────────────────────

class DailySnapshot(BaseModel):
    """A daily aggregated snapshot of the user's application pipeline."""
    date: date
    total_applications: int
    not_contacted: int
    in_progress: int
    interviewing: int
    offer_received: int
    rejected: int
    ghosted: int
    response_rate: float
    calls_dialed: int
    calls_connected: int
    interviews_attended: int
