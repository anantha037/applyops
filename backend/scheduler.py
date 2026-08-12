"""APScheduler jobs for ghosted applications and Telegram reminders."""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler

from backend.llm_feedback import GroqFeedbackService, build_daily_coaching_input
from backend.models import ApplicationStatus, DailyFeedback, DailySnapshot
from backend import db_client
from backend.telegram_bot import TelegramBot

INDIA_TIMEZONE = ZoneInfo("Asia/Kolkata")
logger = logging.getLogger(__name__)


def india_today() -> date:
    return datetime.now(INDIA_TIMEZONE).date()


def flag_ghosted_applications(today: date | None = None) -> int:
    """Mark In Progress applications Ghosted when their due date is over three days late."""
    reference_date = today or india_today()
    overdue_before = reference_date - timedelta(days=3)
    flagged_count = 0
    for application in db_client.list_applications(status=ApplicationStatus.IN_PROGRESS):
        if application.next_action_due is not None and application.next_action_due < overdue_before:
            db_client.update_application(application.id, {"status": ApplicationStatus.GHOSTED})
            flagged_count += 1
    return flagged_count


def send_due_today_reminder(
    telegram: TelegramBot, today: date | None = None
) -> int:
    """Deliver a Telegram reminder only when applications need attention today."""
    applications = db_client.applications_due_on(today or india_today())
    if applications:
        telegram.send_due_today_reminder(applications)
    return len(applications)


def send_daily_feedback(
    feedback_service: GroqFeedbackService,
    telegram: TelegramBot,
    today: date | None = None,
) -> DailyFeedback | None:
    """Generate one daily coaching message; log and skip it if the call fails."""
    try:
        stats = build_daily_coaching_input(today or india_today())
        feedback = feedback_service.generate(stats)
        telegram.send_message(feedback.message)
        return feedback
    except Exception:
        logger.exception("Daily coaching feedback failed; skipping today's message")
        return None


def take_daily_snapshot(today: date | None = None) -> DailySnapshot:
    """Record current pipeline stats to the Daily Snapshots tab."""
    reference_date = today or india_today()
    
    stats = db_client.get_current_pipeline_stats()

    snapshot = DailySnapshot(
        date=reference_date,
        total_applications=stats["Total"],
        not_contacted=stats["Not Contacted"],
        in_progress=stats["In Progress"],
        interviewing=stats["Interviewing"],
        offer_received=stats["Offer Received"],
        rejected=stats["Rejected"],
        ghosted=stats["Ghosted"],
        response_rate=round(stats["response_rate"], 2),
        calls_dialed=stats["calls_dialed"],
        calls_connected=stats["calls_connected"],
        interviews_attended=stats["interviews_attended"],
    )
    db_client.save_daily_snapshot(snapshot)
    return snapshot


class ApplyOpsScheduler:
    """Owns the Phase 2 background jobs for the FastAPI process."""

    def __init__(
        self, telegram: TelegramBot, feedback_service: GroqFeedbackService
    ) -> None:
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
        return flag_ghosted_applications()

    def run_reminder_check(self) -> int:
        return send_due_today_reminder(self._telegram)

    def run_daily_feedback(self) -> DailyFeedback | None:
        return send_daily_feedback(self._feedback_service, self._telegram)

    def run_daily_snapshot(self) -> DailySnapshot:
        return take_daily_snapshot()
