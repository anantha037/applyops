"""Postgres + R2 repository layer for ApplyOps — Migration Phase B.

This module mirrors the public interface of sheets_client.SheetsClient so that
Phase D can swap imports without touching route logic.  Only the repository
layer changes; routes are not wired here yet.

Key design decisions:
- find_or_create_contact() is the most critical piece of logic: see SPEC §10
  "Contact linkage logic" for the exact behaviour (email-first, name+phone
  fallback, fill-blank-but-never-overwrite, one contact per real person).
- resume file bytes go to Cloudflare R2; only storage_key lives in Postgres.
- activity_log.contact_id is denormalised from the application's contact_id
  at write time so the Contacts page never needs to join through Applications.
- Every public function operates within its own Session scope and commits
  immediately — no ambient transaction, safe for concurrent FastAPI handlers.
"""

from __future__ import annotations

import io
import uuid
from datetime import date, datetime, timezone
from typing import IO

from sqlmodel import Session, col, select, func

from backend.db.models import (
    ActivityLog,
    Application as DBApplication,
    CalendarEvent as DBCalendarEvent,
    CalendarEventSource,
    CalendarEventType,
    Contact,
    DailySnapshot as DBDailySnapshot,
    Resume,
    Settings as DBSettings,
    User,
)
from backend.db.session import engine
from backend.models import (
    Activity,
    ActivityCreate,
    Application,
    CalendarEvent,
    CalendarEventCreate,
    CalendarEventUpdate,
    DailySnapshot,
    Settings,
    SettingsUpdate,
    ContactView,
    utc_now,
)
from backend.r2_client import (
    PRESIGNED_URL_TTL_SECONDS,
    R2_BUCKET_NAME,
    get_r2_client,
)

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

MAX_RESUME_BYTES = 10 * 1024 * 1024  # 10 MB

def get_all_user_ids() -> list[str]:
    """Return all active user IDs in the system."""
    with Session(engine) as session:
        return session.exec(select(User.id)).all()


def _new_id() -> str:
    return str(uuid.uuid4())


def _app_to_pydantic(row: DBApplication) -> Application:
    """Convert a SQLModel Application row to the Pydantic Application schema."""
    return Application(
        id=row.id,
        date_applied=row.date_applied,
        company=row.company,
        job_title=row.job_title,
        jd_summary=row.jd_summary or "",
        application_method=row.application_method or "",
        # hr_* fields no longer exist — leave as empty strings so the
        # existing Pydantic schema stays valid until Phase D cleans it up.
        hr_name="",
        hr_phone="",
        hr_email="",
        ctc=row.ctc or "",
        status=row.status,
        stage=row.stage,
        last_touch_date=row.last_touch_date,
        next_action_due=row.next_action_due,
        interview_date=row.interview_date,
        interview_round=row.interview_round or "",
        interview_attended=row.interview_attended,
        latest_update=row.latest_update or "",
        remarks=row.remarks or "",
        contact_id=row.contact_id,
        resume_id=row.resume_id,
    )


def _calendar_to_pydantic(row: DBCalendarEvent) -> CalendarEvent:
    return CalendarEvent(
        id=row.id,
        title=row.title,
        event_type=row.event_type,
        date=row.event_date,
        time=row.time,
        related_application_id=row.related_application_id,
        notes=row.notes or "",
        source=row.source,
    )


# ---------------------------------------------------------------------------
# Contact find-or-create (SPEC §10 "Contact linkage logic")
# ---------------------------------------------------------------------------

def find_or_create_contact(
    session: Session,
    user_id: str,
    *,
    name: str | None = None,
    email: str | None = None,
    phone: str | None = None,
    role: str | None = None,
    company: str | None = None,
) -> Contact | None:
    """Find an existing contact or create a new one.

    Matching priority (SPEC §10):
      1. If email is provided → match case-insensitively on email.
      2. If no email → fall back to name + phone together (both must be present).
      3. No contact fields at all → return None (caller keeps contact_id=None).

    On an existing match:
      - Fill blank fields with newly supplied values.
      - Never overwrite fields that already have a value.

    On no match:
      - Create a new Contact row, prefilled with company from the application.
    """
    # Normalise inputs
    norm_email = email.strip().lower() if email and email.strip() else None
    norm_name  = name.strip()          if name  and name.strip()  else None
    norm_phone = phone.strip()         if phone and phone.strip() else None
    norm_role  = role.strip()          if role  and role.strip()  else None
    norm_company = company.strip()     if company and company.strip() else None

    # Guard: nothing useful supplied → no contact
    if not norm_name and not norm_email and not norm_phone:
        return None

    existing: Contact | None = None

    if norm_email:
        stmt = select(Contact).where(
            Contact.user_id == user_id,
            col(Contact.email).ilike(norm_email)
        )
        existing = session.exec(stmt).first()

    if existing is None and norm_name and norm_phone and not norm_email:
        stmt = select(Contact).where(
            Contact.user_id == user_id,
            col(Contact.name).ilike(norm_name),
            col(Contact.phone) == norm_phone,
        )
        existing = session.exec(stmt).first()

    if existing is not None:
        # Fill blanks — never overwrite populated fields
        changed = False
        if norm_name    and not existing.name:    existing.name    = norm_name;    changed = True
        if norm_email   and not existing.email:   existing.email   = norm_email;   changed = True
        if norm_phone   and not existing.phone:   existing.phone   = norm_phone;   changed = True
        if norm_role    and not existing.role:    existing.role    = norm_role;    changed = True
        if norm_company and not existing.company: existing.company = norm_company; changed = True
        if changed:
            session.add(existing)
        return existing

    # --- No match → create a new contact ---
    contact = Contact(
        id=_new_id(),
        user_id=user_id,
        name=norm_name or f"HR at {norm_company or 'unknown'}",
        email=norm_email,
        phone=norm_phone,
        role=norm_role,
        company=norm_company,
        created_at=datetime.now(timezone.utc),
    )
    session.add(contact)
    session.flush()   # flush so the ID is available before the caller commits
    return contact

def list_contacts(user_id: str) -> list[ContactView]:
    """Return all contacts, enriched with activity data for last_contacted/responded."""
    with Session(engine) as session:
        # Load all contacts
        contacts = session.exec(select(Contact).where(Contact.user_id == user_id)).all()
        
        # Load all activities to compute last_contacted and responded
        activities = session.exec(
            select(ActivityLog).where(
                ActivityLog.user_id == user_id,
                ActivityLog.contact_id.is_not(None)
            )
        ).all()
        
        # Group activities by contact_id
        from collections import defaultdict
        act_by_contact = defaultdict(list)
        for act in activities:
            act_by_contact[act.contact_id].append(act)
            
        # Also need application_id? A contact can have multiple applications. 
        apps = session.exec(
            select(DBApplication).where(
                DBApplication.user_id == user_id,
                DBApplication.contact_id.is_not(None)
            )
        ).all()
        app_by_contact = {}
        for app in apps:
            app_by_contact[app.contact_id] = app.id
            
        results = []
        for c in contacts:
            c_acts = act_by_contact[c.id]
            last_contact = None
            if c_acts:
                last_contact = max(a.timestamp for a in c_acts).date().isoformat()
            
            responded = any(
                a.action_type in ("Call Connected", "Interview Completed", "Email Reply Received") 
                for a in c_acts
            )
            
            results.append(ContactView(
                id=c.id,
                name=c.name or "",
                company=c.company or "",
                role=c.role or "",
                email=c.email or "",
                phone=c.phone or "",
                tags="",
                notes="",
                source="postgres",
                application_id=app_by_contact.get(c.id),
                last_contacted=last_contact,
                responded=responded,
            ))
            
        return results


# ---------------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------------

def list_applications(
    user_id: str,
    status: str | None = None,
    stage:  str | None = None,
) -> list[Application]:
    with Session(engine) as session:
        stmt = select(DBApplication).where(DBApplication.user_id == user_id)
        if status:
            stmt = stmt.where(DBApplication.status == status)
        if stage:
            stmt = stmt.where(DBApplication.stage == stage)
        rows = session.exec(stmt).all()
        return [_app_to_pydantic(r) for r in rows]


def get_application(user_id: str, application_id: str) -> Application | None:
    with Session(engine) as session:
        row = session.get(DBApplication, application_id)
        if not row or row.user_id != user_id:
            return None
        return _app_to_pydantic(row)


def create_application(
    user_id: str,
    payload: dict,
    *,
    contact_name:  str | None = None,
    contact_email: str | None = None,
    contact_phone: str | None = None,
    contact_role:  str | None = None,
    resume_id:     str | None = None,
) -> Application:
    """Create a new application row.

    Inline contact fields trigger find_or_create_contact().  resume_id must
    reference an existing resumes row (or be None).
    """
    with Session(engine) as session:
        contact_id: str | None = None
        if any([contact_name, contact_email, contact_phone]):
            contact = find_or_create_contact(
                session,
                user_id,
                name=contact_name,
                email=contact_email,
                phone=contact_phone,
                role=contact_role,
                company=payload.get("company"),
            )
            contact_id = contact.id if contact else None

        if resume_id is not None:
            resume_row = session.get(Resume, resume_id)
            if not resume_row or resume_row.user_id != user_id:
                raise ValueError("Invalid or unauthorized resume_id")

        app_id = payload.get("id") or _new_id()
        row = DBApplication(
            id=app_id,
            user_id=user_id,
            date_applied=payload["date_applied"],
            company=payload["company"],
            job_title=payload["job_title"],
            jd_summary=payload.get("jd_summary") or None,
            application_method=payload.get("application_method") or None,
            contact_id=contact_id,
            resume_id=resume_id,
            ctc=payload.get("ctc") or None,
            status=payload.get("status", "Not Contacted"),
            stage=payload.get("stage", "Applied"),
            last_touch_date=payload.get("last_touch_date"),
            next_action_due=payload.get("next_action_due"),
            interview_date=payload.get("interview_date"),
            interview_round=payload.get("interview_round") or None,
            interview_attended=payload.get("interview_attended"),
            latest_update=payload.get("latest_update") or None,
            remarks=payload.get("remarks") or None,
        )
        session.add(row)
        session.commit()
        session.refresh(row)
        return _app_to_pydantic(row)


def update_application(
    user_id: str,
    application_id: str,
    changes: dict,
    *,
    contact_name:  str | None = None,
    contact_email: str | None = None,
    contact_phone: str | None = None,
    contact_role:  str | None = None,
    resume_id:     str | None = None,
) -> Application | None:
    """Patch an existing application."""
    with Session(engine) as session:
        row = session.get(DBApplication, application_id)
        if row is None or row.user_id != user_id:
            return None

        # Handle contact linkage
        if any([contact_name, contact_email, contact_phone]):
            contact = find_or_create_contact(
                session,
                user_id,
                name=contact_name,
                email=contact_email,
                phone=contact_phone,
                role=contact_role,
                company=changes.get("company") or row.company,
            )
            row.contact_id = contact.id if contact else row.contact_id

        # Handle resume linkage
        if resume_id is not None:
            resume_row = session.get(Resume, resume_id)
            if not resume_row or resume_row.user_id != user_id:
                raise ValueError("Invalid or unauthorized resume_id")
            row.resume_id = resume_id

        # Apply scalar field updates
        scalar_fields = (
            "date_applied", "company", "job_title", "jd_summary",
            "application_method", "ctc", "status", "stage",
            "last_touch_date", "next_action_due", "interview_date",
            "interview_round", "interview_attended", "latest_update", "remarks",
        )
        for field in scalar_fields:
            if field in changes:
                setattr(row, field, changes[field] if changes[field] != "" else None)

        session.add(row)
        session.commit()
        session.refresh(row)
        return _app_to_pydantic(row)


def delete_application(user_id: str, application_id: str) -> bool:
    with Session(engine) as session:
        row = session.get(DBApplication, application_id)
        if row is None or row.user_id != user_id:
            return False
        session.delete(row)
        session.commit()
        return True


def applications_due_on(user_id: str, target_date: date) -> list[Application]:
    with Session(engine) as session:
        stmt = select(DBApplication).where(
            DBApplication.user_id == user_id,
            DBApplication.next_action_due == target_date
        )
        rows = session.exec(stmt).all()
        return [_app_to_pydantic(r) for r in rows]


# ---------------------------------------------------------------------------
# Activity log
# ---------------------------------------------------------------------------

def create_activity(user_id: str, activity_id: str, payload: ActivityCreate) -> Activity:
    """Create an activity log entry."""
    with Session(engine) as session:
        # Look up the application's contact_id for denormalisation
        contact_id: str | None = None
        if payload.application_id:
            app_row = session.get(DBApplication, payload.application_id)
            if app_row and app_row.user_id == user_id:
                contact_id = app_row.contact_id

        now = utc_now()
        row = ActivityLog(
            id=activity_id,
            user_id=user_id,
            timestamp=now,
            application_id=payload.application_id or None,
            company=payload.company or None,
            action_type=payload.action_type,
            contact_id=contact_id,
            notes=payload.notes or None,
        )
        session.add(row)
        session.commit()
        session.refresh(row)

    return Activity(
        id=row.id,
        timestamp=row.timestamp,
        application_id=row.application_id or "",
        company=row.company or "",
        action_type=row.action_type,
        notes=row.notes or "",
    )


def list_activity(user_id: str, activity_date: date | None = None) -> list[Activity]:
    with Session(engine) as session:
        stmt = select(ActivityLog).where(ActivityLog.user_id == user_id).order_by(col(ActivityLog.timestamp).desc())
        rows = session.exec(stmt).all()

    result = []
    for row in rows:
        ts: datetime = row.timestamp
        # Ensure timezone-aware comparison
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        if activity_date is not None and ts.date() != activity_date:
            continue
        result.append(Activity(
            id=row.id,
            timestamp=ts,
            application_id=row.application_id or "",
            company=row.company or "",
            action_type=row.action_type,
            notes=row.notes or "",
        ))
    return result


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------

def get_settings(user_id: str) -> Settings:
    with Session(engine) as session:
        stmt = select(DBSettings).where(DBSettings.user_id == user_id)
        row = session.exec(stmt).first()
        if row is None:
            return Settings()
        return Settings(
            daily_goal=row.daily_goal,
            working_hours_start=row.working_hours_start,
            working_hours_end=row.working_hours_end,
            telegram_chat_id=row.telegram_chat_id,
            dashboard_pin=row.dashboard_pin,
            app_reminders=row.app_reminders,
            followup_reminders=row.followup_reminders,
            interview_reminders=row.interview_reminders,
            daily_progress=row.daily_progress,
            streak_alerts=row.streak_alerts,
        )


def get_daily_goal(user_id: str) -> int:
    return get_settings(user_id).daily_goal


def update_settings(user_id: str, changes: SettingsUpdate) -> Settings:
    with Session(engine) as session:
        row = session.exec(select(DBSettings).where(DBSettings.user_id == user_id)).first()
        if row is None:
            row = DBSettings(user_id=user_id)
            session.add(row)

        updates = changes.model_dump(exclude_unset=True)
        for field, value in updates.items():
            setattr(row, field, value)

        session.add(row)
        session.commit()
        session.refresh(row)

    return Settings(
        daily_goal=row.daily_goal,
        working_hours_start=row.working_hours_start,
        working_hours_end=row.working_hours_end,
        telegram_chat_id=row.telegram_chat_id,
        dashboard_pin=row.dashboard_pin,
        app_reminders=row.app_reminders,
        followup_reminders=row.followup_reminders,
        interview_reminders=row.interview_reminders,
        daily_progress=row.daily_progress,
        streak_alerts=row.streak_alerts,
    )


# ---------------------------------------------------------------------------
# Calendar events
# ---------------------------------------------------------------------------

def list_calendar_events(
    user_id: str,
    start: date | None = None,
    end:   date | None = None,
) -> list[CalendarEvent]:
    with Session(engine) as session:
        stmt = select(DBCalendarEvent).where(DBCalendarEvent.user_id == user_id).order_by(DBCalendarEvent.event_date)
        if start:
            stmt = stmt.where(DBCalendarEvent.event_date >= start)
        if end:
            stmt = stmt.where(DBCalendarEvent.event_date <= end)
        rows = session.exec(stmt).all()
        return [_calendar_to_pydantic(r) for r in rows]


def get_calendar_event(user_id: str, event_id: str) -> CalendarEvent | None:
    with Session(engine) as session:
        row = session.get(DBCalendarEvent, event_id)
        if row is None or row.user_id != user_id:
            return None
        return _calendar_to_pydantic(row)


def create_calendar_event(user_id: str, event: CalendarEvent) -> CalendarEvent:
    with Session(engine) as session:
        row = DBCalendarEvent(
            id=event.id,
            user_id=user_id,
            title=event.title,
            event_type=event.event_type,
            event_date=event.date,
            time=event.time,
            related_application_id=event.related_application_id,
            notes=event.notes or None,
            source=event.source,
        )
        session.add(row)
        session.commit()
        session.refresh(row)
    return event


def update_calendar_event(user_id: str, event: CalendarEvent) -> CalendarEvent | None:
    with Session(engine) as session:
        row = session.get(DBCalendarEvent, event.id)
        if row is None or row.user_id != user_id:
            return None
        row.title = event.title
        row.event_type = event.event_type
        row.event_date = event.date
        row.time = event.time
        row.notes = event.notes or None
        session.add(row)
        session.commit()
    return event


def delete_calendar_event(user_id: str, event_id: str) -> bool:
    with Session(engine) as session:
        row = session.get(DBCalendarEvent, event_id)
        if row is None or row.user_id != user_id:
            return False
        session.delete(row)
        session.commit()
    return True


def _find_auto_event(
    session: Session,
    user_id: str,
    related_application_id: str,
    event_type: CalendarEventType,
) -> DBCalendarEvent | None:
    stmt = select(DBCalendarEvent).where(
        DBCalendarEvent.user_id == user_id,
        DBCalendarEvent.related_application_id == related_application_id,
        DBCalendarEvent.event_type == event_type,
        DBCalendarEvent.source == CalendarEventSource.AUTO,
    )
    return session.exec(stmt).first()


def sync_followup_event(
    user_id: str,
    application_id: str,
    company: str,
    next_action_due: date | None,
    event_id_factory=lambda: str(uuid.uuid4()),
) -> None:
    with Session(engine) as session:
        existing = _find_auto_event(session, user_id, application_id, CalendarEventType.FOLLOW_UP)
        if next_action_due is None:
            if existing:
                session.delete(existing)
                session.commit()
            return

        title = f"{company} - Follow-up"
        if existing:
            existing.event_date = next_action_due
            existing.title = title
            session.add(existing)
        else:
            row = DBCalendarEvent(
                id=event_id_factory(),
                user_id=user_id,
                title=title,
                event_type=CalendarEventType.FOLLOW_UP,
                event_date=next_action_due,
                related_application_id=application_id,
                notes=None,
                source=CalendarEventSource.AUTO,
            )
            session.add(row)
        session.commit()


def sync_interview_event(
    user_id: str,
    application_id: str,
    company: str,
    interview_date: date | None,
    interview_round: str,
    event_id_factory=lambda: str(uuid.uuid4()),
) -> None:
    with Session(engine) as session:
        existing = _find_auto_event(session, user_id, application_id, CalendarEventType.INTERVIEW)
        if interview_date is None:
            if existing:
                session.delete(existing)
                session.commit()
            return

        title = f"{company} - {interview_round or 'Interview'}"
        if existing:
            existing.event_date = interview_date
            existing.title = title
            session.add(existing)
        else:
            row = DBCalendarEvent(
                id=event_id_factory(),
                user_id=user_id,
                title=title,
                event_type=CalendarEventType.INTERVIEW,
                event_date=interview_date,
                related_application_id=application_id,
                notes=None,
                source=CalendarEventSource.AUTO,
            )
            session.add(row)
        session.commit()


# ---------------------------------------------------------------------------
# Daily snapshots & Analytics
# ---------------------------------------------------------------------------

def get_current_pipeline_stats(user_id: str) -> dict:
    """Return lightweight aggregate queries for current pipeline stats."""
    with Session(engine) as session:
        # Applications counts
        app_counts = session.exec(
            select(DBApplication.status, func.count(DBApplication.id))
            .where(DBApplication.user_id == user_id)
            .group_by(DBApplication.status)
        ).all()
        counts = {status: count for status, count in app_counts}
        total = sum(counts.values())

        # Response rate
        total_contacted = session.exec(
            select(func.count(DBApplication.id))
            .where(
                DBApplication.user_id == user_id,
                DBApplication.status != "Not Contacted"
            )
        ).one()
        
        responded_subq = select(ActivityLog.application_id).where(
            ActivityLog.user_id == user_id,
            col(ActivityLog.action_type).in_(["Call Connected", "Interview Completed"]),
            ActivityLog.application_id.is_not(None)
        ).distinct()
        
        contacted_and_responded = session.exec(
            select(func.count(DBApplication.id))
            .where(
                DBApplication.user_id == user_id,
                DBApplication.status != "Not Contacted",
                col(DBApplication.id).in_(responded_subq)
            )
        ).one()
        
        response_rate = (contacted_and_responded / total_contacted * 100) if total_contacted > 0 else 0.0
        
        # Activity counts
        act_counts = session.exec(
            select(ActivityLog.action_type, func.count(ActivityLog.id))
            .where(ActivityLog.user_id == user_id)
            .group_by(ActivityLog.action_type)
        ).all()
        activities = {atype: count for atype, count in act_counts}
        
    return {
        "Total": total,
        "Not Contacted": counts.get("Not Contacted", 0),
        "In Progress": counts.get("In Progress", 0),
        "Interviewing": counts.get("Interviewing", 0),
        "Offer Received": counts.get("Offer Received", 0),
        "Rejected": counts.get("Rejected", 0),
        "Ghosted": counts.get("Ghosted", 0),
        "response_rate": response_rate,
        "calls_dialed": activities.get("Call Dialed", 0),
        "calls_connected": activities.get("Call Connected", 0),
        "interviews_attended": activities.get("Interview Completed", 0)
    }

def get_application_sources(user_id: str) -> dict[str, int]:
    """Aggregate counts by application_method."""
    with Session(engine) as session:
        rows = session.exec(
            select(DBApplication.application_method, func.count(DBApplication.id))
            .where(DBApplication.user_id == user_id)
            .group_by(DBApplication.application_method)
        ).all()
        sources = {}
        for method, count in rows:
            name = method if method else "Others"
            sources[name] = sources.get(name, 0) + count
        return sources

def list_daily_snapshots(user_id: str) -> list[DailySnapshot]:
    with Session(engine) as session:
        rows = session.exec(
            select(DBDailySnapshot)
            .where(DBDailySnapshot.user_id == user_id)
            .order_by(DBDailySnapshot.snapshot_date)
        ).all()
        return [
            DailySnapshot(
                date=r.snapshot_date,
                total_applications=r.total_applications,
                not_contacted=r.not_contacted,
                in_progress=r.in_progress,
                interviewing=r.interviewing,
                offer_received=r.offer_received,
                rejected=r.rejected,
                ghosted=r.ghosted,
                response_rate=r.response_rate,
                calls_dialed=r.calls_dialed,
                calls_connected=r.calls_connected,
                interviews_attended=r.interviews_attended,
            )
            for r in rows
        ]


def save_daily_snapshot(user_id: str, snapshot: DailySnapshot) -> None:
    """Upsert: update today's row if it exists, else insert."""
    with Session(engine) as session:
        existing = session.exec(
            select(DBDailySnapshot).where(
                DBDailySnapshot.user_id == user_id,
                DBDailySnapshot.snapshot_date == snapshot.date
            )
        ).first()

        if existing:
            existing.total_applications  = snapshot.total_applications
            existing.not_contacted       = snapshot.not_contacted
            existing.in_progress         = snapshot.in_progress
            existing.interviewing        = snapshot.interviewing
            existing.offer_received      = snapshot.offer_received
            existing.rejected            = snapshot.rejected
            existing.ghosted             = snapshot.ghosted
            existing.response_rate       = snapshot.response_rate
            existing.calls_dialed        = snapshot.calls_dialed
            existing.calls_connected     = snapshot.calls_connected
            existing.interviews_attended = snapshot.interviews_attended
            session.add(existing)
        else:
            row = DBDailySnapshot(
                id=_new_id(),
                user_id=user_id,
                snapshot_date=snapshot.date,
                total_applications=snapshot.total_applications,
                not_contacted=snapshot.not_contacted,
                in_progress=snapshot.in_progress,
                interviewing=snapshot.interviewing,
                offer_received=snapshot.offer_received,
                rejected=snapshot.rejected,
                ghosted=snapshot.ghosted,
                response_rate=snapshot.response_rate,
                calls_dialed=snapshot.calls_dialed,
                calls_connected=snapshot.calls_connected,
                interviews_attended=snapshot.interviews_attended,
            )
            session.add(row)
        session.commit()


# ---------------------------------------------------------------------------
# Resumes — metadata in Postgres, file bytes in Cloudflare R2
# ---------------------------------------------------------------------------

class ResumeMeta:
    """Simple dataclass returned by resume repository functions."""
    __slots__ = ("id", "filename", "storage_key", "label", "uploaded_at")

    def __init__(
        self,
        id: str,
        filename: str,
        storage_key: str,
        label: str | None,
        uploaded_at: datetime,
    ) -> None:
        self.id          = id
        self.filename    = filename
        self.storage_key = storage_key
        self.label       = label
        self.uploaded_at = uploaded_at


def upload_resume(
    user_id: str,
    file: IO[bytes],
    filename: str,
    *,
    label: str | None = None,
    content_type: str = "application/pdf",
) -> ResumeMeta:
    """Upload a resume PDF to R2 and store its metadata in Postgres.

    Validates:
    - File size <= 10 MB (MAX_RESUME_BYTES).
    - Filename extension must be .pdf.
    - content_type should be application/pdf.

    The object stored in R2 is private — never publicly accessible.
    """
    if not filename.lower().endswith(".pdf"):
        raise ValueError("Only PDF resumes are accepted (.pdf extension required)")
    if content_type not in ("application/pdf", "application/octet-stream"):
        raise ValueError(f"Invalid content type: {content_type!r}. Only PDF is accepted.")

    data = file.read()
    if len(data) > MAX_RESUME_BYTES:
        raise ValueError(
            f"Resume too large: {len(data):,} bytes (max {MAX_RESUME_BYTES:,} bytes / 10 MB)"
        )

    resume_id   = _new_id()
    storage_key = f"{user_id}/resumes/{resume_id}.pdf"

    # Upload to R2
    client = get_r2_client()
    client.put_object(
        Bucket=R2_BUCKET_NAME,
        Key=storage_key,
        Body=data,
        ContentType="application/pdf",
    )

    # Persist metadata in Postgres
    with Session(engine) as session:
        row = Resume(
            id=resume_id,
            user_id=user_id,
            filename=filename,
            storage_key=storage_key,
            label=label or None,
            uploaded_at=datetime.now(timezone.utc),
        )
        session.add(row)
        session.commit()
        session.refresh(row)

    return ResumeMeta(
        id=row.id,
        filename=row.filename,
        storage_key=row.storage_key,
        label=row.label,
        uploaded_at=row.uploaded_at,
    )


def list_resumes(user_id: str) -> list[ResumeMeta]:
    """List all resume metadata rows, newest first."""
    with Session(engine) as session:
        rows = session.exec(
            select(Resume).where(Resume.user_id == user_id).order_by(col(Resume.uploaded_at).desc())
        ).all()
    return [
        ResumeMeta(
            id=r.id,
            filename=r.filename,
            storage_key=r.storage_key,
            label=r.label,
            uploaded_at=r.uploaded_at,
        )
        for r in rows
    ]


def get_resume_presigned_url(
    user_id: str,
    resume_id: str,
    ttl_seconds: int = PRESIGNED_URL_TTL_SECONDS,
) -> str | None:
    """Return a short-lived presigned download URL for a private R2 object."""
    with Session(engine) as session:
        row = session.get(Resume, resume_id)
        if row is None or row.user_id != user_id:
            return None
        storage_key = row.storage_key

    client = get_r2_client()
    url: str = client.generate_presigned_url(
        "get_object",
        Params={"Bucket": R2_BUCKET_NAME, "Key": storage_key},
        ExpiresIn=ttl_seconds,
    )
    return url


def delete_resume(user_id: str, resume_id: str) -> bool:
    """Delete a resume from R2 and remove its Postgres metadata row."""
    with Session(engine) as session:
        row = session.get(Resume, resume_id)
        if row is None or row.user_id != user_id:
            return False
        storage_key = row.storage_key
        session.delete(row)
        session.commit()

    # Best-effort R2 delete — don't let an R2 error leave orphan metadata
    try:
        client = get_r2_client()
        client.delete_object(Bucket=R2_BUCKET_NAME, Key=storage_key)
    except Exception:
        pass  # Log in Phase D; not critical for Phase B

    return True
