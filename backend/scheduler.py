"""APScheduler jobs for ghosted applications and Telegram reminders."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler

from backend.models import ApplicationStatus
from backend.sheets_client import SheetsClient
from backend.telegram_bot import TelegramBot

INDIA_TIMEZONE = ZoneInfo("Asia/Kolkata")


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


class ApplyOpsScheduler:
    """Owns the Phase 2 background jobs for the FastAPI process."""

    def __init__(self, sheets: SheetsClient, telegram: TelegramBot) -> None:
        self._sheets = sheets
        self._telegram = telegram
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

    def start(self) -> None:
        self._scheduler.start()

    def shutdown(self) -> None:
        if self._scheduler.running:
            self._scheduler.shutdown(wait=False)

    def run_ghosted_check(self) -> int:
        return flag_ghosted_applications(self._sheets)

    def run_reminder_check(self) -> int:
        return send_due_today_reminder(self._sheets, self._telegram)
