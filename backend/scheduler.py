"""APScheduler jobs for ghosted applications and Telegram reminders."""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler

from backend.llm_feedback import GroqFeedbackService, build_daily_coaching_input
from backend.models import ApplicationStatus, DailyFeedback, DailySnapshot
from backend.sheets_client import SheetsClient
from backend.telegram_bot import TelegramBot

INDIA_TIMEZONE = ZoneInfo("Asia/Kolkata")
logger = logging.getLogger(__name__)


def india_today() -> date:
    return datetime.now(INDIA_TIMEZONE).date()


def flag_ghosted_applications(sheets: SheetsClient, today: date | None = None) -> int:
    """Mark In Progress applications Ghosted when their due date is over three days late."""
    reference_date = today or india_today()
    overdue_before = reference_date - timedelta(days=3)
    flagged_count = 0
    for application in sheets.list_applications(status=ApplicationStatus.IN_PROGRESS):
        if application.next_action_due is not None and application.next_action_due < overdue_before:
            application.status = ApplicationStatus.GHOSTED
            sheets.update_application(application)
            flagged_count += 1
    return flagged_count


def send_due_today_reminder(
    sheets: SheetsClient, telegram: TelegramBot, today: date | None = None
) -> int:
    """Deliver a Telegram reminder only when applications need attention today."""
    applications = sheets.applications_due_on(today or india_today())
    if applications:
        telegram.send_due_today_reminder(applications)
    return len(applications)


def send_daily_feedback(
    sheets: SheetsClient,
    feedback_service: GroqFeedbackService,
    telegram: TelegramBot,
    today: date | None = None,
) -> DailyFeedback | None:
    """Generate one daily coaching message; log and skip it if the call fails."""
    try:
        stats = build_daily_coaching_input(sheets, today or india_today())
        feedback = feedback_service.generate(stats)
        telegram.send_message(feedback.message)
        return feedback
    except Exception:
        logger.exception("Daily coaching feedback failed; skipping today's message")
        return None


def take_daily_snapshot(sheets: SheetsClient, today: date | None = None) -> DailySnapshot:
    """Record current pipeline stats to the Daily Snapshots tab."""
    reference_date = today or india_today()
    applications = sheets.list_applications()
    all_activities = sheets.list_activity(None)

    # Status counts
    counts = {
        "Total": len(applications),
        "Not Contacted": 0,
        "In Progress": 0,
        "Interviewing": 0,
        "Offer Received": 0,
        "Rejected": 0,
        "Ghosted": 0,
    }
    for app in applications:
        if app.status in counts:
            counts[app.status] += 1
        else:
            # Fallback for unrecognized status
            counts["In Progress"] += 1

    # Response Rate logic (same as Dashboard)
    contacted_apps = [app for app in applications if app.status != "Not Contacted"]
    total_contacted = len(contacted_apps)
    responded_app_ids = {
        act.application_id for act in all_activities
        if act.action_type in ("Call Connected", "Interview Completed")
    }
    contacted_and_responded = sum(1 for app in contacted_apps if app.id in responded_app_ids)
    response_rate = (contacted_and_responded / total_contacted * 100) if total_contacted > 0 else 0.0

    # Activity counts (all time or just today? SPEC says "calls_dialed, calls_connected, interviews_attended". Let's assume all-time cumulative counts as it's a snapshot, or perhaps just today? Actually "today's row" implies today's activity, or total. The snapshot is a snapshot of the *current state*. Let's make it total cumulative counts so the deltas work easily. Yes, total cumulative).
    calls_dialed = sum(1 for act in all_activities if act.action_type == "Call Dialed")
    calls_connected = sum(1 for act in all_activities if act.action_type == "Call Connected")
    interviews_attended = sum(1 for act in all_activities if act.action_type == "Interview Completed")

    snapshot = DailySnapshot(
        date=reference_date,
        total_applications=counts["Total"],
        not_contacted=counts["Not Contacted"],
        in_progress=counts["In Progress"],
        interviewing=counts["Interviewing"],
        offer_received=counts["Offer Received"],
        rejected=counts["Rejected"],
        ghosted=counts["Ghosted"],
        response_rate=round(response_rate, 2),
        calls_dialed=calls_dialed,
        calls_connected=calls_connected,
        interviews_attended=interviews_attended,
    )
    sheets.save_daily_snapshot(snapshot)
    return snapshot


class ApplyOpsScheduler:
    """Owns the Phase 2 background jobs for the FastAPI process."""

    def __init__(
        self, sheets: SheetsClient, telegram: TelegramBot, feedback_service: GroqFeedbackService
    ) -> None:
        self._sheets = sheets
        self._telegram = telegram
        self._feedback_service = feedback_service
        self._scheduler = BackgroundScheduler(timezone=INDIA_TIMEZONE)
        self._scheduler.add_job(
            self.run_ghosted_check,
            trigger="cron",
            hour=9,
            minute=0,
            id="ghosted-auto-flag",
            replace_existing=True,
        )
        self._scheduler.add_job(
            self.run_reminder_check,
            trigger="cron",
            hour=15,
            minute=0,
            id="due-today-reminder",
            replace_existing=True,
        )
        self._scheduler.add_job(
            self.run_daily_feedback,
            trigger="cron",
            hour=21,
            minute=0,
            id="daily-coaching-feedback",
            replace_existing=True,
        )
        # Snapshot right after feedback
        self._scheduler.add_job(
            self.run_daily_snapshot,
            trigger="cron",
            hour=21,
            minute=5,
            id="daily-snapshot",
            replace_existing=True,
        )

    def start(self) -> None:
        self._scheduler.start()

    def shutdown(self) -> None:
        if self._scheduler.running:
            self._scheduler.shutdown(wait=False)

    def run_ghosted_check(self) -> int:
        return flag_ghosted_applications(self._sheets)

    def run_reminder_check(self) -> int:
        return send_due_today_reminder(self._sheets, self._telegram)

    def run_daily_feedback(self) -> DailyFeedback | None:
        return send_daily_feedback(self._sheets, self._feedback_service, self._telegram)

    def run_daily_snapshot(self) -> DailySnapshot:
        return take_daily_snapshot(self._sheets)
