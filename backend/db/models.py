"""SQLModel table definitions for ApplyOps — multi-user schema (SPEC §11).

Nine tables (users + auth tables added across F1/F2):
    users, contacts, resumes, applications, activity_log,
    calendar_events, daily_snapshots, settings,
    refresh_tokens, password_reset_tokens, login_attempts

Key structural decisions:
- users.email: unique index on lower(email) for case-insensitive matching.
- settings.user_id is UNIQUE (one settings row per user).
- daily_snapshots unique constraint is (user_id, snapshot_date).
- applications does NOT contain hr_name / hr_phone / hr_email.
- R2 object keys are user-scoped: <user_id>/resumes/<resume_id>.pdf
"""

from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from enum import StrEnum
from typing import Optional

from sqlmodel import Field, SQLModel, UniqueConstraint


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _new_uuid() -> str:
    return str(uuid.uuid4())


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Enums
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
    RECRUITER  = "Recruiter"
    HR_MANAGER = "HR Manager"
    REFERRER   = "Referrer"
    OTHER      = "Other"


# ---------------------------------------------------------------------------
# users  (NEW — Feature Phase F1)
# ---------------------------------------------------------------------------

class User(SQLModel, table=True):
    """Authenticated user account.

    email is stored normalised (lowercase).  The unique index enforces
    case-insensitive uniqueness at the database level.
    """

    __tablename__ = "users"

    id:            str      = Field(default_factory=_new_uuid, primary_key=True)
    email:         str      = Field(unique=True, index=True)   # stored lowercase
    password_hash: str
    created_at:    datetime = Field(default_factory=_utc_now)


# ---------------------------------------------------------------------------
# contacts
# ---------------------------------------------------------------------------

class Contact(SQLModel, table=True):
    """HR / recruiter contact.  Single source of truth — never duplicated
    within a user's account.  Contacts are user-scoped: same email under
    two different user accounts produces two separate Contact rows.
    """

    __tablename__ = "contacts"

    id:         str           = Field(default_factory=_new_uuid, primary_key=True)
    user_id:    Optional[str] = Field(default=None, foreign_key="users.id", index=True)
    name:       str
    company:    Optional[str] = Field(default=None)
    role:       Optional[str] = Field(default=None)
    email:      Optional[str] = Field(default=None)
    phone:      Optional[str] = Field(default=None)
    tags:       Optional[str] = Field(default=None)
    notes:      Optional[str] = Field(default=None)
    created_at: datetime      = Field(default_factory=_utc_now)


# ---------------------------------------------------------------------------
# resumes
# ---------------------------------------------------------------------------

class Resume(SQLModel, table=True):
    """Metadata for a resume PDF stored in Cloudflare R2.
    R2 object key is user-scoped: <user_id>/resumes/<resume_id>.pdf
    """

    __tablename__ = "resumes"

    id:          str           = Field(default_factory=_new_uuid, primary_key=True)
    user_id:     Optional[str] = Field(default=None, foreign_key="users.id", index=True)
    filename:    str
    storage_key: str                             # object key in R2 — never a public URL
    label:       Optional[str] = Field(default=None)
    uploaded_at: datetime      = Field(default_factory=_utc_now)


# ---------------------------------------------------------------------------
# applications
# ---------------------------------------------------------------------------

class Application(SQLModel, table=True):
    """One job application."""

    __tablename__ = "applications"

    id:                  str           = Field(default_factory=_new_uuid, primary_key=True)
    user_id:             Optional[str] = Field(default=None, foreign_key="users.id", index=True)
    date_applied:        date          = Field(default_factory=date.today)
    company:             str
    job_title:           str
    jd_summary:          Optional[str] = Field(default=None)
    application_method:  Optional[str] = Field(default=None)
    contact_id:          Optional[str] = Field(default=None, foreign_key="contacts.id")
    resume_id:           Optional[str] = Field(default=None, foreign_key="resumes.id")
    ctc:                 Optional[str] = Field(default=None)
    status:              str           = Field(default=ApplicationStatus.NOT_CONTACTED)
    stage:               str           = Field(default=ApplicationStage.APPLIED)
    last_touch_date:     Optional[date] = Field(default=None)
    next_action_due:     Optional[date] = Field(default=None)
    interview_date:      Optional[date] = Field(default=None)
    interview_round:     Optional[str]  = Field(default=None)
    interview_attended:  Optional[bool] = Field(default=None)
    latest_update:       Optional[str]  = Field(default=None)
    remarks:             Optional[str]  = Field(default=None)


# ---------------------------------------------------------------------------
# activity_log
# ---------------------------------------------------------------------------

class ActivityLog(SQLModel, table=True):
    """One action event (call, email, interview, …)."""

    __tablename__ = "activity_log"

    id:             str           = Field(default_factory=_new_uuid, primary_key=True)
    user_id:        Optional[str] = Field(default=None, foreign_key="users.id", index=True)
    timestamp:      datetime      = Field(default_factory=_utc_now)
    application_id: Optional[str] = Field(default=None, foreign_key="applications.id")
    company:        Optional[str] = Field(default=None)
    action_type:    str
    contact_id:     Optional[str] = Field(default=None, foreign_key="contacts.id")
    notes:          Optional[str] = Field(default=None)


# ---------------------------------------------------------------------------
# calendar_events
# ---------------------------------------------------------------------------

class CalendarEvent(SQLModel, table=True):
    """A calendar event — auto-generated or manually created."""

    __tablename__ = "calendar_events"

    id:                     str           = Field(default_factory=_new_uuid, primary_key=True)
    user_id:                Optional[str] = Field(default=None, foreign_key="users.id", index=True)
    title:                  str
    event_type:             str
    event_date:             date
    time:                   Optional[str] = Field(default=None)
    related_application_id: Optional[str] = Field(default=None, foreign_key="applications.id")
    notes:                  Optional[str] = Field(default=None)
    source:                 str           = Field(default=CalendarEventSource.MANUAL)


# ---------------------------------------------------------------------------
# daily_snapshots
# ---------------------------------------------------------------------------

class DailySnapshot(SQLModel, table=True):
    """One row per (user, calendar day) — written by the nightly scheduler."""

    __tablename__  = "daily_snapshots"
    __table_args__ = (UniqueConstraint("user_id", "snapshot_date", name="uq_snapshot_user_date"),)

    id:                  str           = Field(default_factory=_new_uuid, primary_key=True)
    user_id:             Optional[str] = Field(default=None, foreign_key="users.id", index=True)
    snapshot_date:       date          = Field()          # uniqueness via __table_args__
    total_applications:  int           = Field(default=0)
    not_contacted:       int           = Field(default=0)
    in_progress:         int           = Field(default=0)
    interviewing:        int           = Field(default=0)
    offer_received:      int           = Field(default=0)
    rejected:            int           = Field(default=0)
    ghosted:             int           = Field(default=0)
    response_rate:       float         = Field(default=0.0)
    calls_dialed:        int           = Field(default=0)
    calls_connected:     int           = Field(default=0)
    interviews_attended: int           = Field(default=0)


# ---------------------------------------------------------------------------
# settings  (one row per user, enforced via UNIQUE on user_id)
# ---------------------------------------------------------------------------

class Settings(SQLModel, table=True):
    """Per-user configuration.  Exactly one row per user (unique user_id)."""

    __tablename__  = "settings"
    __table_args__ = (UniqueConstraint("user_id", name="uq_settings_user_id"),)

    id:                   Optional[int] = Field(default=None, primary_key=True)
    user_id:              Optional[str] = Field(default=None, foreign_key="users.id", index=True)
    daily_goal:           int           = Field(default=0)
    working_hours_start:  str           = Field(default="09:00")
    working_hours_end:    str           = Field(default="18:00")
    telegram_chat_id:     str           = Field(default="")
    dashboard_pin:        str           = Field(default="")
    app_reminders:        bool          = Field(default=True)
    followup_reminders:   bool          = Field(default=True)
    interview_reminders:  bool          = Field(default=True)
    daily_progress:       bool          = Field(default=True)
    streak_alerts:        bool          = Field(default=True)


# ---------------------------------------------------------------------------
# refresh_tokens  (Feature Phase F2)
# ---------------------------------------------------------------------------

class RefreshToken(SQLModel, table=True):
    """Server-side refresh token record.  Revoked on logout and rotated on use."""

    __tablename__ = "refresh_tokens"

    id:          str      = Field(default_factory=_new_uuid, primary_key=True)
    user_id:     str      = Field(foreign_key="users.id", index=True)
    token_hash:  str      = Field(index=True)  # SHA-256 of the raw token
    expires_at:  datetime
    created_at:  datetime = Field(default_factory=_utc_now)
    revoked:     bool     = Field(default=False)


# ---------------------------------------------------------------------------
# password_reset_tokens  (Feature Phase F2)
# ---------------------------------------------------------------------------

class PasswordResetToken(SQLModel, table=True):
    """Single-use, time-limited password reset token.

    token_hash is SHA-256 of the raw token sent to the user.
    used_at is set when the token is consumed — prevents reuse.
    """

    __tablename__ = "password_reset_tokens"

    id:         str            = Field(default_factory=_new_uuid, primary_key=True)
    user_id:    str            = Field(foreign_key="users.id", index=True)
    token_hash: str            = Field(index=True)
    expires_at: datetime
    created_at: datetime       = Field(default_factory=_utc_now)
    used_at:    Optional[datetime] = Field(default=None)


# ---------------------------------------------------------------------------
# login_attempts  (Feature Phase F2 — rate limiting)
# ---------------------------------------------------------------------------

class LoginAttempt(SQLModel, table=True):
    """Per (email, IP) login attempt log used for rate limiting.

    Failed attempts within the RATE_LIMIT_WINDOW are counted; if they reach
    RATE_LIMIT_MAX_ATTEMPTS the login endpoint returns 429.
    """

    __tablename__ = "login_attempts"

    id:           str      = Field(default_factory=_new_uuid, primary_key=True)
    email:        str      = Field(index=True)   # already lowercased
    ip_address:   str
    attempted_at: datetime = Field(default_factory=_utc_now)
    success:      bool     = Field(default=False)
