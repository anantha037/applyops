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
    
    for user_id in db_client.get_all_user_ids():
        for application in db_client.list_applications(user_id, status=ApplicationStatus.IN_PROGRESS):
            if application.next_action_due is not None and application.next_action_due < overdue_before:
                db_client.update_application(user_id, application.id, {"status": ApplicationStatus.GHOSTED})
                flagged_count += 1
    return flagged_count


def send_due_today_reminder(
    telegram: TelegramBot, today: date | None = None
) -> int:
    """Deliver a Telegram reminder only when applications need attention today."""
    reference_date = today or india_today()
    total_sent = 0
    for user_id in db_client.get_all_user_ids():
        applications = db_client.applications_due_on(user_id, reference_date)
        if applications:
            settings = db_client.get_settings(user_id)
            if settings.telegram_chat_id:
                telegram.send_due_today_reminder(applications, chat_id=settings.telegram_chat_id)
                total_sent += len(applications)
    return total_sent


def send_daily_feedback(
    feedback_service: GroqFeedbackService,
    telegram: TelegramBot,
    today: date | None = None,
) -> int:
    """Generate one daily coaching message per user; log and skip it if the call fails."""
    reference_date = today or india_today()
    sent_count = 0
    for user_id in db_client.get_all_user_ids():
        try:
            settings = db_client.get_settings(user_id)
            if not settings.telegram_chat_id:
                continue

            stats = build_daily_coaching_input(user_id, reference_date)
            feedback = feedback_service.generate(stats)
            telegram.send_message(feedback.message, chat_id=settings.telegram_chat_id)
            sent_count += 1
        except Exception:
            logger.exception("Daily coaching feedback failed for user %s; skipping", user_id)
    return sent_count


def take_daily_snapshot(today: date | None = None) -> int:
    """Record current pipeline stats to the Daily Snapshots tab for all users."""
    reference_date = today or india_today()
    snapshots_taken = 0
    
    for user_id in db_client.get_all_user_ids():
        stats = db_client.get_current_pipeline_stats(user_id)
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
        db_client.save_daily_snapshot(user_id, snapshot)
        snapshots_taken += 1
        
    return snapshots_taken


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

    def run_daily_feedback(self) -> int:
        return send_daily_feedback(self._feedback_service, self._telegram)

    def run_daily_snapshot(self) -> int:
        return take_daily_snapshot()
