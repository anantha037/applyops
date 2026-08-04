from datetime import date

from backend.models import Application, ApplicationStage, ApplicationStatus
from backend.scheduler import flag_ghosted_applications, send_daily_feedback, send_due_today_reminder


def application(
    application_id: str,
    *,
    status: ApplicationStatus = ApplicationStatus.IN_PROGRESS,
    next_action_due: date | None = None,
) -> Application:
    return Application(
        id=application_id,
        company="Acme",
        job_title="Engineer",
        status=status,
        stage=ApplicationStage.CALLED,
        next_action_due=next_action_due,
    )


class FakeSheetsClient:
    def __init__(self, applications: list[Application]) -> None:
        self.applications = applications
        self.updated: list[Application] = []

    def list_applications(self, status: str | None = None) -> list[Application]:
        return [app for app in self.applications if status is None or app.status == status]

    def applications_due_on(self, target_date: date) -> list[Application]:
        return [app for app in self.applications if app.next_action_due == target_date]

    def update_application(self, updated_application: Application) -> Application:
        self.updated.append(updated_application)
        return updated_application


class FakeTelegramBot:
    def __init__(self) -> None:
        self.sent: list[list[Application]] = []

    def send_due_today_reminder(self, applications: list[Application]) -> None:
        self.sent.append(applications)

    def send_message(self, message: str) -> None:
        self.sent.append([message])


def test_ghosted_check_only_flags_more_than_three_days_overdue() -> None:
    today = date(2026, 8, 5)
    overdue = application("overdue", next_action_due=date(2026, 8, 1))
    exactly_three_days = application("three-days", next_action_due=date(2026, 8, 2))
    no_due_date = application("no-due-date")
    already_rejected = application(
        "rejected", status=ApplicationStatus.REJECTED, next_action_due=date(2026, 8, 1)
    )
    sheets = FakeSheetsClient([overdue, exactly_three_days, no_due_date, already_rejected])

    assert flag_ghosted_applications(sheets, today) == 1
    assert overdue.status == ApplicationStatus.GHOSTED
    assert exactly_three_days.status == ApplicationStatus.IN_PROGRESS
    assert no_due_date.status == ApplicationStatus.IN_PROGRESS
    assert already_rejected.status == ApplicationStatus.REJECTED
    assert [app.id for app in sheets.updated] == ["overdue"]


def test_reminder_sends_only_when_applications_are_due() -> None:
    today = date(2026, 8, 5)
    due = application("due", next_action_due=today)
    not_due = application("not-due", next_action_due=date(2026, 8, 6))
    sheets = FakeSheetsClient([due, not_due])
    telegram = FakeTelegramBot()

    assert send_due_today_reminder(sheets, telegram, today) == 1
    assert telegram.sent == [[due]]

    assert send_due_today_reminder(FakeSheetsClient([not_due]), telegram, today) == 0
    assert telegram.sent == [[due]]


def test_daily_feedback_logs_and_skips_when_groq_fails(monkeypatch, caplog) -> None:
    class FailingFeedbackService:
        def generate(self, _stats):
            raise RuntimeError("Groq unavailable")

    monkeypatch.setattr("backend.scheduler.build_daily_coaching_input", lambda *_: object())
    telegram = FakeTelegramBot()

    assert send_daily_feedback(object(), FailingFeedbackService(), telegram, date(2026, 8, 5)) is None
    assert telegram.sent == []
    assert "Daily coaching feedback failed" in caplog.text
