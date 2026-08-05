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


class ApplicationUpdate(BaseModel):
    """Partial payload for an existing application."""

    model_config = ConfigDict(use_enum_values=True)

    date_applied: date | None = None
    company: Annotated[str | None, Field(min_length=1)] = None
    job_title: Annotated[str | None, Field(min_length=1)] = None
    jd_summary: str | None = None
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


class Application(ApplicationFields):
    """Persisted application record."""

    id: str
    next_action_due: date | None = None


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
    working_hours_start: str = ""
    working_hours_end: str = ""
    telegram_chat_id: str = ""
    dashboard_pin: str = ""


class SettingsUpdate(BaseModel):
    daily_goal: int | None = Field(default=None, ge=0)
    working_hours_start: str | None = None
    working_hours_end: str | None = None
    telegram_chat_id: str | None = None
    dashboard_pin: str | None = None


def utc_now() -> datetime:
    return datetime.now(timezone.utc)
