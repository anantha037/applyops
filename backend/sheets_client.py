"""Google Sheets persistence for ApplyOps."""

from __future__ import annotations

import json
import os
from datetime import date, datetime
from pathlib import Path
from typing import Any, Callable

import gspread
from dotenv import load_dotenv
from google.oauth2.service_account import Credentials

from backend.models import (
    Activity, ActivityCreate, Application,
    CalendarEvent, CalendarEventCreate, CalendarEventSource, CalendarEventType, CalendarEventUpdate,
    ContactCreate, ContactManual, ContactView,
    DailySnapshot, Settings, SettingsUpdate, utc_now,
)

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

APPLICATIONS_HEADERS = [
    "ID", "Date Applied", "Company", "Job Title", "JD Summary", "Application Method",
    "HR Name", "HR Phone", "HR Email", "CTC", "Status", "Stage", "Last Touch Date",
    "Next Action Due", "Interview Date", "Interview Round", "Interview Attended",
    "Latest Update", "Remarks",
]
ACTIVITY_LOG_HEADERS = ["ID", "Timestamp", "Application ID", "Company", "Action Type", "Notes"]
SETTINGS_HEADERS = [
    "Daily Goal", "Working Hours Start", "Working Hours End", "Telegram Chat ID", "Dashboard PIN"
]
CALENDAR_EVENTS_HEADERS = [
    "ID", "Title", "Event Type", "Date", "Time",
    "Related Application ID", "Notes", "Source",
]
CONTACTS_MANUAL_HEADERS = [
    "ID", "Name", "Company", "Role", "Email", "Phone", "Tags", "Notes",
]
DAILY_SNAPSHOTS_HEADERS = [
    "Date", "Total Applications", "Not Contacted", "In Progress",
    "Interviewing", "Offer Received", "Rejected", "Ghosted",
    "Response Rate", "Calls Dialed", "Calls Connected", "Interviews Attended"
]

WORKSHEET_HEADERS = {
    "Applications":    APPLICATIONS_HEADERS,
    "Activity Log":    ACTIVITY_LOG_HEADERS,
    "Settings":        SETTINGS_HEADERS,
    "Calendar Events": CALENDAR_EVENTS_HEADERS,
    "Contacts_Manual": CONTACTS_MANUAL_HEADERS,
    "Daily Snapshots": DAILY_SNAPSHOTS_HEADERS,
}
SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]


class SheetConfigurationError(RuntimeError):
    """Raised when the local credentials required for Sheets are missing or invalid."""


def _serialize(value: Any) -> str | int | float | bool:
    if value is None:
        return ""
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return value


def _as_optional_bool(value: str) -> bool | None:
    if not value:
        return None
    return value.strip().lower() in {"true", "1", "yes"}


class SheetsClient:
    """Read and write the ApplyOps workbook using the configured service account."""

    def __init__(self) -> None:
        self._spreadsheet_id = os.getenv("GOOGLE_SHEET_ID", "").strip()
        credentials_value = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "").strip()
        if not self._spreadsheet_id:
            raise SheetConfigurationError("GOOGLE_SHEET_ID is not configured in .env")
        if not credentials_value:
            raise SheetConfigurationError("GOOGLE_SERVICE_ACCOUNT_JSON is not configured in .env")

        credentials = self._load_credentials(credentials_value)
        self._spreadsheet = gspread.authorize(credentials).open_by_key(self._spreadsheet_id)
        self._cache: dict[str, list[dict]] = {}
        self._cache_time = 0.0

    def _get_cached_records(self, worksheet_name: str, fetcher: Callable) -> list[dict]:
        import time
        now = time.time()
        if now - self._cache_time > 15:
            self._cache.clear()
            self._cache_time = now
            
        if worksheet_name not in self._cache:
            self._cache[worksheet_name] = fetcher().get_all_records()
            
        return self._cache[worksheet_name]

    def _invalidate_cache(self) -> None:
        self._cache.clear()

    @staticmethod
    def _load_credentials(credentials_value: str) -> Credentials:
        """Support either an absolute key-file path or a JSON object in the environment."""
        key_path = Path(credentials_value)
        if key_path.is_file():
            return Credentials.from_service_account_file(key_path, scopes=SCOPES)
        try:
            service_account_info = json.loads(credentials_value)
        except json.JSONDecodeError as exc:
            raise SheetConfigurationError(
                "GOOGLE_SERVICE_ACCOUNT_JSON must be a service-account JSON string or a valid file path"
            ) from exc
        return Credentials.from_service_account_info(service_account_info, scopes=SCOPES)

    def ensure_structure(self) -> None:
        """Create required tabs and write headers only when a tab is empty."""
        existing_titles = {worksheet.title for worksheet in self._spreadsheet.worksheets()}
        for title, headers in WORKSHEET_HEADERS.items():
            worksheet = (
                self._spreadsheet.worksheet(title)
                if title in existing_titles
                else self._spreadsheet.add_worksheet(title=title, rows=1000, cols=len(headers))
            )
            if not worksheet.row_values(1):
                worksheet.append_row(headers, value_input_option="RAW")
            elif worksheet.row_values(1) != headers:
                raise SheetConfigurationError(
                    f"Worksheet '{title}' has unexpected headers. Expected: {headers}"
                )

    def list_applications(
        self, status: str | None = None, stage: str | None = None
    ) -> list[Application]:
        records = self._get_cached_records("Applications", self._applications)
        applications = [self._application_from_row(row) for row in records]
        return [
            application
            for application in applications
            if (status is None or application.status == status)
            and (stage is None or application.stage == stage)
        ]

    def create_application(self, application: Application) -> Application:
        self._applications().append_row(self._application_row(application), value_input_option="RAW")
        self._invalidate_cache()
        return application

    def applications_due_on(self, target_date: date) -> list[Application]:
        """Return applications whose next scheduled action is due on target_date."""
        return [
            application
            for application in self.list_applications()
            if application.next_action_due == target_date
        ]

    def get_application(self, application_id: str) -> Application | None:
        row_number = self._application_row_number(application_id)
        if row_number is None:
            return None
        row = dict(zip(APPLICATIONS_HEADERS, self._applications().row_values(row_number), strict=False))
        return self._application_from_row(row)

    def update_application(self, application: Application) -> Application | None:
        row_number = self._application_row_number(application.id)
        if row_number is None:
            return None
        last_column = gspread.utils.rowcol_to_a1(row_number, len(APPLICATIONS_HEADERS))
        self._applications().update(
            f"A{row_number}:{last_column}", [self._application_row(application)], value_input_option="RAW"
        )
        self._invalidate_cache()
        return application

    def delete_application(self, application_id: str) -> bool:
        row_number = self._application_row_number(application_id)
        if row_number is None:
            return False
        self._applications().delete_rows(row_number)
        self._invalidate_cache()
        return True

    def create_activity(self, activity_id: str, payload: ActivityCreate) -> Activity:
        activity = Activity(
            id=activity_id,
            timestamp=utc_now(),
            application_id=payload.application_id,
            company=payload.company,
            action_type=payload.action_type,
            notes=payload.notes,
        )
        self._activity_log().append_row(
            [_serialize(value) for value in activity.model_dump().values()], value_input_option="RAW"
        )
        self._invalidate_cache()
        return activity

    def list_activity(self, activity_date: date | None = None) -> list[Activity]:
        activities: list[Activity] = []
        records = self._get_cached_records("Activity Log", self._activity_log)
        for row in records:
            timestamp = datetime.fromisoformat(row["Timestamp"].replace("Z", "+00:00"))
            if activity_date is None or timestamp.date() == activity_date:
                activities.append(
                    Activity(
                        id=row["ID"], timestamp=timestamp, application_id=row["Application ID"],
                        company=row["Company"], action_type=row["Action Type"], notes=row["Notes"],
                    )
                )
        return activities

    def get_daily_goal(self) -> int:
        """Return the configured daily goal, or zero when Settings is still blank."""
        return self.get_settings().daily_goal

    def get_settings(self) -> Settings:
        records = self._get_cached_records("Settings", self._settings)
        if not records:
            return Settings()
        record = records[0]
        try:
            daily_goal = int(record.get("Daily Goal") or 0)
        except (TypeError, ValueError) as exc:
            raise SheetConfigurationError("Settings 'Daily Goal' must be a whole number") from exc
        return Settings(
            daily_goal=daily_goal,
            working_hours_start=record.get("Working Hours Start", ""),
            working_hours_end=record.get("Working Hours End", ""),
            telegram_chat_id=record.get("Telegram Chat ID", ""),
            dashboard_pin=record.get("Dashboard PIN", ""),
        )

    def update_settings(self, changes: SettingsUpdate) -> Settings:
        settings = self.get_settings().model_copy(update=changes.model_dump(exclude_unset=True))
        self._settings().update(
            "A2:E2",
            [[settings.daily_goal, settings.working_hours_start, settings.working_hours_end,
              settings.telegram_chat_id, settings.dashboard_pin]],
            value_input_option="RAW",
        )
        return settings

    def _applications(self) -> gspread.Worksheet:
        return self._spreadsheet.worksheet("Applications")

    def _activity_log(self) -> gspread.Worksheet:
        return self._spreadsheet.worksheet("Activity Log")

    def _settings(self) -> gspread.Worksheet:
        return self._spreadsheet.worksheet("Settings")

    def _application_row_number(self, application_id: str) -> int | None:
        values = self._applications().col_values(1)
        try:
            return values.index(application_id) + 1
        except ValueError:
            return None

    @staticmethod
    def _application_row(application: Application) -> list[str | int | float | bool]:
        values = application.model_dump()
        return [_serialize(values[field]) for field in (
            "id", "date_applied", "company", "job_title", "jd_summary", "application_method",
            "hr_name", "hr_phone", "hr_email", "ctc", "status", "stage", "last_touch_date",
            "next_action_due", "interview_date", "interview_round", "interview_attended",
            "latest_update", "remarks",
        )]

    @staticmethod
    def _application_from_row(row: dict[str, Any]) -> Application:
        return Application(
            id=row["ID"], date_applied=row["Date Applied"], company=row["Company"],
            job_title=row["Job Title"], jd_summary=row["JD Summary"],
            application_method=row["Application Method"], hr_name=row["HR Name"],
            hr_phone=row["HR Phone"], hr_email=row["HR Email"], ctc=row["CTC"],
            status=row["Status"], stage=row["Stage"], last_touch_date=row["Last Touch Date"] or None,
            next_action_due=row["Next Action Due"] or None,
            interview_date=row["Interview Date"] or None, interview_round=row["Interview Round"],
            interview_attended=_as_optional_bool(row["Interview Attended"]),
            latest_update=row["Latest Update"], remarks=row["Remarks"],
        )

    # ── Calendar Events ─────────────────────────────────────────────────────

    def _calendar_events(self) -> gspread.Worksheet:
        return self._spreadsheet.worksheet("Calendar Events")

    @staticmethod
    def _calendar_row(event: CalendarEvent) -> list[str]:
        return [
            event.id,
            event.title,
            event.event_type,
            _serialize(event.date),
            event.time or "",
            event.related_application_id or "",
            event.notes,
            event.source,
        ]

    @staticmethod
    def _calendar_from_row(row: dict[str, Any]) -> CalendarEvent:
        return CalendarEvent(
            id=row["ID"],
            title=row["Title"],
            event_type=row["Event Type"],
            date=row["Date"],
            time=row["Time"] or None,
            related_application_id=row["Related Application ID"] or None,
            notes=row["Notes"],
            source=row["Source"],
        )

    def _calendar_row_number(self, event_id: str) -> int | None:
        values = self._calendar_events().col_values(1)
        try:
            return values.index(event_id) + 1
        except ValueError:
            return None

    def list_calendar_events(
        self,
        start: date | None = None,
        end: date | None = None,
    ) -> list[CalendarEvent]:
        events: list[CalendarEvent] = []
        records = self._get_cached_records("Calendar Events", self._calendar_events)
        for row in records:
            if not row["ID"]:
                continue
            try:
                ev = self._calendar_from_row(row)
            except Exception:
                continue
            if start and ev.date < start:
                continue
            if end and ev.date > end:
                continue
            events.append(ev)
        return events

    def create_calendar_event(self, event: CalendarEvent) -> CalendarEvent:
        self._calendar_events().append_row(
            self._calendar_row(event), value_input_option="RAW"
        )
        self._invalidate_cache()
        return event

    def get_calendar_event(self, event_id: str) -> CalendarEvent | None:
        row_num = self._calendar_row_number(event_id)
        if row_num is None:
            return None
        row = dict(zip(
            CALENDAR_EVENTS_HEADERS,
            self._calendar_events().row_values(row_num),
            strict=False,
        ))
        return self._calendar_from_row(row)

    def update_calendar_event(self, event: CalendarEvent) -> CalendarEvent | None:
        row_num = self._calendar_row_number(event.id)
        if row_num is None:
            return None
        last_col = gspread.utils.rowcol_to_a1(row_num, len(CALENDAR_EVENTS_HEADERS))
        self._calendar_events().update(
            f"A{row_num}:{last_col}",
            [self._calendar_row(event)],
            value_input_option="RAW",
        )
        self._invalidate_cache()
        return event

    def delete_calendar_event(self, event_id: str) -> bool:
        row_num = self._calendar_row_number(event_id)
        if row_num is None:
            return False
        self._calendar_events().delete_rows(row_num)
        self._invalidate_cache()
        return True

    # ── Auto-sync helpers ────────────────────────────────────────────────────

    def _find_auto_event(
        self,
        related_application_id: str,
        event_type: CalendarEventType,
    ) -> CalendarEvent | None:
        """Find the single Auto-sourced event for an application + type pair."""
        for ev in self.list_calendar_events():
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
        event_id_factory: "Callable[[], str]",
    ) -> None:
        """Upsert or delete the Auto Follow-up event for an application.

        If next_action_due is not None → upsert (create or update in-place).
        If next_action_due is None     → delete the auto event if it exists.
        """
        existing = self._find_auto_event(application_id, CalendarEventType.FOLLOW_UP)
        if next_action_due is None:
            if existing:
                self.delete_calendar_event(existing.id)
            return

        if existing:
            updated = existing.model_copy(update={"date": next_action_due, "title": f"{company} – Follow-up"})
            self.update_calendar_event(updated)
        else:
            new_event = CalendarEvent(
                id=event_id_factory(),
                title=f"{company} – Follow-up",
                event_type=CalendarEventType.FOLLOW_UP,
                date=next_action_due,
                time=None,
                related_application_id=application_id,
                notes="",
                source=CalendarEventSource.AUTO,
            )
            self.create_calendar_event(new_event)

    def sync_interview_event(
        self,
        application_id: str,
        company: str,
        interview_date: date | None,
        interview_round: str,
        event_id_factory: "Callable[[], str]",
    ) -> None:
        """Upsert or delete the Auto Interview event for an application."""
        existing = self._find_auto_event(application_id, CalendarEventType.INTERVIEW)
        if interview_date is None:
            if existing:
                self.delete_calendar_event(existing.id)
            return

        title = f"{company} – {interview_round or 'Interview'}"
        if existing:
            updated = existing.model_copy(update={"date": interview_date, "title": title})
            self.update_calendar_event(updated)
        else:
            new_event = CalendarEvent(
                id=event_id_factory(),
                title=title,
                event_type=CalendarEventType.INTERVIEW,
                date=interview_date,
                time=None,
                related_application_id=application_id,
                notes="",
                source=CalendarEventSource.AUTO,
            )
            self.create_calendar_event(new_event)

    # ── Contacts_Manual ──────────────────────────────────────────────────────

    def _contacts_manual_ws(self) -> gspread.Worksheet:
        return self._spreadsheet.worksheet("Contacts_Manual")

    @staticmethod
    def _contact_manual_from_row(row: dict[str, Any]) -> ContactManual:
        return ContactManual(
            id=row["ID"],
            name=row["Name"],
            company=row.get("Company", ""),
            role=row.get("Role", ""),
            email=row.get("Email", ""),
            phone=row.get("Phone", ""),
            tags=row.get("Tags", ""),
            notes=row.get("Notes", ""),
        )

    def list_contacts_manual(self) -> list[ContactManual]:
        records = self._get_cached_records("Contacts_Manual", self._contacts_manual_ws)
        return [
            self._contact_manual_from_row(row)
            for row in records
            if row.get("ID")
        ]

    def create_contact_manual(self, contact: ContactManual) -> ContactManual:
        self._contacts_manual_ws().append_row(
            [
                contact.id, contact.name, contact.company, contact.role,
                contact.email, contact.phone, contact.tags, contact.notes,
            ],
            value_input_option="RAW",
        )
        self._invalidate_cache()
        return contact

    # ── Merged contacts view ─────────────────────────────────────────────────

    def get_contacts_merged(self) -> list[ContactView]:
        """Merge Application-derived HR contacts with Contacts_Manual, deduped by email.

        Enrichment from Activity Log:
          last_contacted — latest timestamp for any activity linked to that application
          responded      — True if any "Call Connected" or "Interview Completed" exists
        """
        applications   = self.list_applications()
        all_activities = self.list_activity(None)

        # Build per-application activity maps
        last_touched: dict[str, str] = {}   # app_id → latest ISO timestamp string
        responded_ids: set[str] = set()

        for act in all_activities:
            app_id = act.application_id
            ts_str = act.timestamp.isoformat()
            if app_id not in last_touched or ts_str > last_touched[app_id]:
                last_touched[app_id] = ts_str
            if act.action_type in ("Call Connected", "Interview Completed"):
                responded_ids.add(app_id)

        # Normalise email for dedup (lowercase, strip)
        def _norm(email: str) -> str:
            return email.strip().lower()

        # --- Build contacts from Applications HR fields ---
        # key: normalised email (non-empty) → ContactView
        by_email: dict[str, ContactView] = {}
        # contacts with no email, keyed by application_id
        no_email: list[ContactView] = []

        for app in applications:
            hr_name  = (app.hr_name  or "").strip()
            hr_email = (app.hr_email or "").strip()
            hr_phone = (app.hr_phone or "").strip()

            if not hr_name and not hr_email and not hr_phone:
                continue  # no HR info at all — skip

            app_last = None
            if app.id in last_touched:
                # Convert timestamp to date string for the response
                app_last = last_touched[app.id][:10]

            contact = ContactView(
                id=f"app:{app.id}",
                name=hr_name or f"HR at {app.company}",
                company=app.company or "",
                role="",
                email=hr_email,
                phone=hr_phone,
                tags="",
                notes="",
                source="application",
                application_id=app.id,
                last_contacted=app_last,
                responded=app.id in responded_ids,
            )

            norm = _norm(hr_email)
            if norm:
                by_email[norm] = contact
            else:
                no_email.append(contact)

        # --- Merge in Contacts_Manual, deduping by email ---
        for manual in self.list_contacts_manual():
            norm = _norm(manual.email)
            if norm and norm in by_email:
                # Email exists from an application — merge: enrich source flag and
                # fill any blank fields the application record left empty.
                existing = by_email[norm]
                by_email[norm] = existing.model_copy(update={
                    "source":  "both",
                    "name":    existing.name  or manual.name,
                    "role":    existing.role  or manual.role,
                    "tags":    existing.tags  or manual.tags,
                    "notes":   existing.notes or manual.notes,
                    "phone":   existing.phone or manual.phone,
                })
            else:
                # New contact — add as manual-only
                view = ContactView(
                    id=f"manual:{manual.id}",
                    name=manual.name,
                    company=manual.company,
                    role=manual.role,
                    email=manual.email,
                    phone=manual.phone,
                    tags=manual.tags,
                    notes=manual.notes,
                    source="manual",
                    application_id=None,
                    last_contacted=None,
                    responded=False,
                )
                if norm:
                    by_email[norm] = view
                else:
                    no_email.append(view)

        result = list(by_email.values()) + no_email
        # Sort: most recently contacted first, then alphabetical
        result.sort(key=lambda c: (c.last_contacted or "", c.name))
        return result


    # ── Daily Snapshots ──────────────────────────────────────────────────────

    def _daily_snapshots_ws(self) -> gspread.Worksheet:
        return self._spreadsheet.worksheet("Daily Snapshots")

    def list_daily_snapshots(self) -> list[DailySnapshot]:
        records = self._get_cached_records("Daily Snapshots", self._daily_snapshots_ws)
        snapshots = []
        for row in records:
            if not row.get("Date"):
                continue
            snapshots.append(DailySnapshot(
                date=datetime.strptime(str(row["Date"]), "%Y-%m-%d").date(),
                total_applications=int(row.get("Total Applications") or 0),
                not_contacted=int(row.get("Not Contacted") or 0),
                in_progress=int(row.get("In Progress") or 0),
                interviewing=int(row.get("Interviewing") or 0),
                offer_received=int(row.get("Offer Received") or 0),
                rejected=int(row.get("Rejected") or 0),
                ghosted=int(row.get("Ghosted") or 0),
                response_rate=float(str(row.get("Response Rate", 0)).strip('%') or 0),
                calls_dialed=int(row.get("Calls Dialed") or 0),
                calls_connected=int(row.get("Calls Connected") or 0),
                interviews_attended=int(row.get("Interviews Attended") or 0)
            ))
        return snapshots

    def save_daily_snapshot(self, snapshot: DailySnapshot) -> None:
        """Upsert a daily snapshot by date."""
        ws = self._daily_snapshots_ws()
        records = ws.get_all_records()
        
        date_str = snapshot.date.isoformat()
        row_idx = None
        for i, row in enumerate(records):
            if row.get("Date") == date_str:
                row_idx = i + 2  # +2 because header is row 1, 0-indexed enumerate
                break
                
        row_data = [
            date_str,
            snapshot.total_applications,
            snapshot.not_contacted,
            snapshot.in_progress,
            snapshot.interviewing,
            snapshot.offer_received,
            snapshot.rejected,
            snapshot.ghosted,
            snapshot.response_rate,
            snapshot.calls_dialed,
            snapshot.calls_connected,
            snapshot.interviews_attended,
        ]
        
        if row_idx:
            # Update existing row
            cell_range = f"A{row_idx}:L{row_idx}"
            ws.update(values=[row_data], range_name=cell_range, value_input_option="RAW")
        else:
            # Append new row
            ws.append_row(row_data, value_input_option="RAW")
        self._invalidate_cache()

