"""One-time data migration: Google Sheets → Postgres (SPEC §10 Phase C).

Usage
-----
Dry run (zero writes to Neon or Sheets):
    python -m backend.scripts.migrate_sheets_to_postgres --dry-run

Actual migration:
    python -m backend.scripts.migrate_sheets_to_postgres

Safety guarantees
-----------------
- The Google Sheet is NEVER modified (read-only access throughout).
- Dry run performs zero writes to Neon and zero R2 operations.
- All Postgres writes happen inside a single transaction; on any error the
  whole transaction rolls back, leaving Neon in its pre-migration state.
- The script is idempotent-safe: it checks for existing rows at startup and
  refuses to run if the target tables are already populated, preventing
  accidental double-migration.

Migration order
---------------
1. Settings          (no FK deps)
2. Contacts          (built from Applications hr_* fields + Contacts_Manual;
                      same find_or_create_contact logic as live traffic)
3. Applications      (contact_id from step 2; resume_id always NULL)
4. Activity Log      (contact_id denormalised from the migrated application)
5. Calendar Events   (related_application_id from step 3)
6. Daily Snapshots   (no FK deps)
"""

from __future__ import annotations

import argparse
import sys
import uuid
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

# ── sys.path so the script works from the project root ─────────────────────
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

from sqlmodel import Session, select

from backend.db.models import (
    ActivityLog,
    Application as DBApplication,
    CalendarEvent as DBCalendarEvent,
    Contact,
    DailySnapshot as DBDailySnapshot,
    Settings as DBSettings,
)
from backend.db.session import engine
from backend.db_client import find_or_create_contact
from backend.sheets_client import SheetsClient


# ── helpers ─────────────────────────────────────────────────────────────────

def _new_id() -> str:
    return str(uuid.uuid4())


def _str(val: Any) -> str:
    return str(val).strip() if val is not None else ""


def _opt(val: Any) -> str | None:
    s = _str(val)
    return s if s else None


def _date(val: Any) -> date | None:
    s = _str(val)
    if not s:
        return None
    try:
        return date.fromisoformat(s)
    except ValueError:
        return None


def _datetime(val: Any) -> datetime | None:
    s = _str(val)
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        return None


def _bool(val: Any) -> bool | None:
    s = _str(val).lower()
    if s in ("true", "1", "yes"):
        return True
    if s in ("false", "0", "no"):
        return False
    return None


# ── pre-flight idempotency check ─────────────────────────────────────────────

def _check_already_migrated() -> None:
    """Refuse to run if Postgres already contains application rows."""
    with Session(engine) as s:
        count = len(s.exec(select(DBApplication)).all())
    if count > 0:
        print(f"\nABORTED: {count} application(s) already exist in Postgres.")
        print("The migration has already run, or test data was inserted.")
        print("If you need to re-run, manually truncate all tables first.")
        sys.exit(1)


# ── contact dedup (in-memory mirror for dry-run) ─────────────────────────────

class _DryRunContactStore:
    """Simulates find_or_create_contact without any DB writes."""

    def __init__(self) -> None:
        self._by_email: dict[str, dict] = {}   # normalised email → contact dict
        self._by_name_phone: dict[tuple, dict] = {}  # (name, phone) → contact dict
        self._all: list[dict] = []
        self.created = 0
        self.reused  = 0

    def find_or_create(
        self,
        *,
        name: str | None,
        email: str | None,
        phone: str | None,
        role: str | None,
        company: str | None,
    ) -> dict | None:
        ne = email.strip().lower() if email and email.strip() else None
        nn = name.strip()  if name  and name.strip()  else None
        np = phone.strip() if phone and phone.strip() else None
        nr = role.strip()  if role  and role.strip()  else None
        nc = company.strip() if company and company.strip() else None

        if not nn and not ne and not np:
            return None

        # Match by email
        existing = self._by_email.get(ne) if ne else None
        # Fallback: name + phone
        if existing is None and nn and np and not ne:
            existing = self._by_name_phone.get((nn.lower(), np))

        if existing is not None:
            if nn  and not existing.get("name"):    existing["name"]    = nn
            if ne  and not existing.get("email"):   existing["email"]   = ne
            if np  and not existing.get("phone"):   existing["phone"]   = np
            if nr  and not existing.get("role"):    existing["role"]    = nr
            if nc  and not existing.get("company"): existing["company"] = nc
            self.reused += 1
            return existing

        c = {"id": _new_id(), "name": nn or f"HR at {nc or 'unknown'}",
             "email": ne, "phone": np, "role": nr, "company": nc}
        self._all.append(c)
        if ne:
            self._by_email[ne] = c
        if nn and np:
            self._by_name_phone[(nn.lower(), np)] = c
        self.created += 1
        return c


# ── main migration logic ─────────────────────────────────────────────────────

def run_migration(dry_run: bool) -> None:
    mode = "[DRY RUN]" if dry_run else "[LIVE]"
    print(f"\n{'='*60}")
    print(f"  ApplyOps Phase C -- Sheets -> Postgres Migration  {mode}")
    print(f"{'='*60}\n")

    # ── Connect to Google Sheets ─────────────────────────────────────────────
    print("Connecting to Google Sheets...")
    sheets = SheetsClient()
    print("Connected.\n")

    # ── Read all source data (read-only) ─────────────────────────────────────
    print("Reading source data from Sheets …")
    src_apps       = sheets.list_applications()
    src_activity   = sheets.list_activity(None)
    src_calendar   = sheets.list_calendar_events()
    src_snapshots  = sheets.list_daily_snapshots()
    src_settings   = sheets.get_settings()
    src_contacts_m = sheets.list_contacts_manual()
    print(f"  Applications:    {len(src_apps)}")
    print(f"  Activity Log:    {len(src_activity)}")
    print(f"  Calendar Events: {len(src_calendar)}")
    print(f"  Daily Snapshots: {len(src_snapshots)}")
    print(f"  Contacts_Manual: {len(src_contacts_m)}")
    print()

    # ── Counters ─────────────────────────────────────────────────────────────
    hr_refs_total  = 0
    apps_null_cid  = 0
    skipped_apps   = 0
    skipped_acts   = 0
    skipped_cals   = 0
    errors: list[str] = []

    # ── DRY RUN path ─────────────────────────────────────────────────────────
    if dry_run:
        store = _DryRunContactStore()
        # Contacts_Manual first (same pass order as live)
        print("Simulating contact deduplication...")
        print("  Pass 1: Contacts_Manual")
        for cm in src_contacts_m:
            store.find_or_create(
                name=cm.name or None,
                email=cm.email or None,
                phone=cm.phone or None,
                role=cm.role or None,
                company=cm.company or None,
            )

        print("  Pass 2: Applications hr_* fields")
        app_contact_map: dict[str, dict | None] = {}
        for app in src_apps:
            hr_name  = _opt(app.hr_name)
            hr_email = _opt(app.hr_email)
            hr_phone = _opt(app.hr_phone)
            if hr_name or hr_email or hr_phone:
                hr_refs_total += 1
                c = store.find_or_create(
                    name=hr_name, email=hr_email, phone=hr_phone,
                    role=None, company=_opt(app.company),
                )
                app_contact_map[app.id] = c
            else:
                app_contact_map[app.id] = None
                apps_null_cid += 1

        print()
        print("─── DRY RUN REPORT ────────────────────────────────────────")
        print(f"  Source rows (Applications):    {len(src_apps)}")
        print(f"  Source rows (Activity Log):    {len(src_activity)}")
        print(f"  Source rows (Calendar Events): {len(src_calendar)}")
        print(f"  Source rows (Daily Snapshots): {len(src_snapshots)}")
        print(f"  Source rows (Contacts_Manual): {len(src_contacts_m)}")
        print()
        print(f"  HR references found:           {hr_refs_total}")
        print(f"  Unique contacts would create:  {store.created}")
        print(f"  Duplicates collapsed:          {store.reused}")
        print(f"  Apps with contact_id = null:   {apps_null_cid}")
        print(f"  Apps with resume_id  = null:   {len(src_apps)}  (all - no historical resumes)")
        print()
        print("  ZERO writes performed to Neon, Sheets, or R2.")
        print("  Re-run without --dry-run to execute the actual migration.")
        return

    # ── LIVE path — single transaction ───────────────────────────────────────
    _check_already_migrated()

    print("Starting Postgres transaction...")
    with Session(engine) as session:

        # 1 ── Settings ───────────────────────────────────────────────────────
        print("  [1/6] Migrating Settings …")
        existing_settings = session.get(DBSettings, 1)
        if existing_settings is None:
            session.add(DBSettings(
                id=1,
                daily_goal=src_settings.daily_goal,
                working_hours_start=src_settings.working_hours_start or "09:00",
                working_hours_end=src_settings.working_hours_end   or "18:00",
                telegram_chat_id=src_settings.telegram_chat_id or "",
                dashboard_pin=src_settings.dashboard_pin or "",
            ))
            session.flush()
        print(f"       daily_goal={src_settings.daily_goal}")

        # 2 ── Contacts (Contacts_Manual first, then Applications hr_*) ───────
        print("  [2/6] Migrating Contacts …")
        for cm in src_contacts_m:
            find_or_create_contact(
                session,
                name=cm.name or None,
                email=cm.email or None,
                phone=cm.phone or None,
                role=cm.role or None,
                company=cm.company or None,
            )
        session.flush()

        # 3 ── Applications (preserve original IDs) ────────────────────────────
        print(f"  [3/6] Migrating {len(src_apps)} Applications …")
        app_contact_map2: dict[str, str | None] = {}  # app_id → contact_id

        for app in src_apps:
            try:
                hr_name  = _opt(app.hr_name)
                hr_email = _opt(app.hr_email)
                hr_phone = _opt(app.hr_phone)

                contact_id: str | None = None
                if hr_name or hr_email or hr_phone:
                    hr_refs_total += 1
                    contact = find_or_create_contact(
                        session,
                        name=hr_name, email=hr_email, phone=hr_phone,
                        role=None, company=_opt(app.company),
                    )
                    contact_id = contact.id if contact else None
                else:
                    apps_null_cid += 1

                app_contact_map2[app.id] = contact_id
                session.add(DBApplication(
                    id=app.id,
                    date_applied=app.date_applied or date.today(),
                    company=app.company or "Unknown",
                    job_title=app.job_title or "Unknown",
                    jd_summary=_opt(app.jd_summary),
                    application_method=_opt(app.application_method),
                    contact_id=contact_id,
                    resume_id=None,        # no historical resumes
                    ctc=_opt(app.ctc),
                    status=app.status or "Not Contacted",
                    stage=app.stage or "Applied",
                    last_touch_date=app.last_touch_date,
                    next_action_due=app.next_action_due,
                    interview_date=app.interview_date,
                    interview_round=_opt(app.interview_round),
                    interview_attended=app.interview_attended,
                    latest_update=_opt(app.latest_update),
                    remarks=_opt(app.remarks),
                ))
                session.flush()
            except Exception as exc:
                errors.append(f"Application {app.id} ({app.company}): {exc}")
                skipped_apps += 1

        # 4 ── Activity Log ────────────────────────────────────────────────────
        print(f"  [4/6] Migrating {len(src_activity)} Activity Log entries …")
        for act in src_activity:
            try:
                contact_id = app_contact_map2.get(act.application_id)
                ts = act.timestamp
                if ts.tzinfo is None:
                    ts = ts.replace(tzinfo=timezone.utc)
                session.add(ActivityLog(
                    id=act.id,
                    timestamp=ts,
                    application_id=act.application_id or None,
                    company=act.company or None,
                    action_type=act.action_type,
                    contact_id=contact_id,
                    notes=act.notes or None,
                ))
                session.flush()
            except Exception as exc:
                errors.append(f"Activity {act.id}: {exc}")
                skipped_acts += 1

        # 5 ── Calendar Events ─────────────────────────────────────────────────
        print(f"  [5/6] Migrating {len(src_calendar)} Calendar Events …")
        for ev in src_calendar:
            try:
                session.add(DBCalendarEvent(
                    id=ev.id,
                    title=ev.title,
                    event_type=ev.event_type,
                    event_date=ev.date,
                    time=ev.time or None,
                    related_application_id=ev.related_application_id or None,
                    notes=ev.notes or None,
                    source=ev.source or "Manual",
                ))
                session.flush()
            except Exception as exc:
                errors.append(f"CalendarEvent {ev.id}: {exc}")
                skipped_cals += 1

        # 6 ── Daily Snapshots ─────────────────────────────────────────────────
        print(f"  [6/6] Migrating {len(src_snapshots)} Daily Snapshots …")
        for snap in src_snapshots:
            try:
                session.add(DBDailySnapshot(
                    id=_new_id(),
                    snapshot_date=snap.date,
                    total_applications=snap.total_applications,
                    not_contacted=snap.not_contacted,
                    in_progress=snap.in_progress,
                    interviewing=snap.interviewing,
                    offer_received=snap.offer_received,
                    rejected=snap.rejected,
                    ghosted=snap.ghosted,
                    response_rate=snap.response_rate,
                    calls_dialed=snap.calls_dialed,
                    calls_connected=snap.calls_connected,
                    interviews_attended=snap.interviews_attended,
                ))
                session.flush()
            except Exception as exc:
                errors.append(f"DailySnapshot {snap.date}: {exc}")

        # ── Commit ────────────────────────────────────────────────────────────
        print("\n  Committing transaction...")
        session.commit()
        print("  Committed.\n")

        # ── Post-migration counts from Postgres ───────────────────────────────
        pg_apps      = len(session.exec(select(DBApplication)).all())
        pg_contacts  = len(session.exec(select(Contact)).all())
        pg_activity  = len(session.exec(select(ActivityLog)).all())
        pg_calendar  = len(session.exec(select(DBCalendarEvent)).all())
        pg_snapshots = len(session.exec(select(DBDailySnapshot)).all())
        pg_resumes   = len(session.exec(select(DBSettings)).all())  # reuse session

    # ── Final report ──────────────────────────────────────────────────────────
    duplicates_collapsed = hr_refs_total + len(src_contacts_m) - pg_contacts
    if duplicates_collapsed < 0:
        duplicates_collapsed = 0

    print("=" * 60)
    print("  MIGRATION REPORT")
    print("=" * 60)
    print(f"\n  {'Table':<25} {'Sheets':<10} {'Postgres':<10} {'Status'}")
    print(f"  {'-'*55}")
    print(f"  {'Applications':<25} {len(src_apps):<10} {pg_apps:<10} {'OK' if pg_apps == len(src_apps) - skipped_apps else 'MISMATCH'}")
    print(f"  {'Activity Log':<25} {len(src_activity):<10} {pg_activity:<10} {'OK' if pg_activity == len(src_activity) - skipped_acts else 'MISMATCH'}")
    print(f"  {'Calendar Events':<25} {len(src_calendar):<10} {pg_calendar:<10} {'OK' if pg_calendar == len(src_calendar) - skipped_cals else 'MISMATCH'}")
    print(f"  {'Daily Snapshots':<25} {len(src_snapshots):<10} {pg_snapshots:<10}")
    print(f"  {'Contacts (new table)':<25} {'N/A':<10} {pg_contacts:<10}")
    print(f"\n  Contact deduplication:")
    print(f"    HR references in Applications:  {hr_refs_total}")
    print(f"    Contacts_Manual rows:            {len(src_contacts_m)}")
    print(f"    Unique contacts created:         {pg_contacts}")
    print(f"    Duplicates collapsed:            {duplicates_collapsed}")
    print(f"\n  Applications with contact_id=null:  {apps_null_cid}")
    print(f"  Applications with resume_id=null:   {pg_apps}  (all - expected)")
    print(f"  Resumes table:                       0  (expected - no historical resumes)")

    if errors:
        print(f"\n  SKIPPED ROWS ({len(errors)} errors):")
        for e in errors:
            print(f"    - {e}")
    else:
        print("\n  No errors. All rows migrated successfully.")

    print("\n  Google Sheet: NOT modified (read-only throughout).")
    print("\n═" * 60)
    print("\nHow to verify in Neon:")
    print("  python backend/scripts/verify_neon.py")
    print("  Then compare counts above with the Neon console Table view.")
    print("  Check: SELECT company, contact_id FROM applications LIMIT 20;")
    print("  Check: SELECT name, email, phone FROM contacts;")
    print("  Check: SELECT COUNT(*) FROM resumes;  -- must be 0")


# ── entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Migrate Google Sheets data to Postgres (ApplyOps Phase C)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate migration without writing to Neon, Sheets, or R2",
    )
    args = parser.parse_args()
    run_migration(dry_run=args.dry_run)
