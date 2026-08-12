import sys
from datetime import date
from backend.scheduler import flag_ghosted_applications, send_due_today_reminder, send_daily_feedback, take_daily_snapshot
from backend.telegram_bot import TelegramBot
from backend.llm_feedback import GroqFeedbackService

class DummyTelegram:
    def send_due_today_reminder(self, apps):
        print(f"Mock Telegram: Sending due today reminder for {len(apps)} apps")
    def send_message(self, msg):
        print(f"Mock Telegram: Sending message '{msg}'")

class DummyFeedbackService:
    def generate(self, stats):
        from backend.models import DailyFeedback
        print(f"Mock Groq: Generated feedback for stats: {stats}")
        return DailyFeedback(date=stats.date, message="Mock feedback message")

def test_scheduler_jobs():
    today = date(2026, 8, 12)
    print("Testing flag_ghosted_applications...")
    ghosted_count = flag_ghosted_applications(today)
    print(f"Ghosted count: {ghosted_count}")

    print("Testing send_due_today_reminder...")
    dummy_tg = DummyTelegram()
    reminder_count = send_due_today_reminder(dummy_tg, today)
    print(f"Reminder count: {reminder_count}")

    print("Testing take_daily_snapshot...")
    snapshot = take_daily_snapshot(today)
    print(f"Snapshot taken for: {snapshot.date}")

    print("Testing send_daily_feedback with real Groq...")
    real_tg = DummyTelegram()
    try:
        real_feedback_svc = GroqFeedbackService()
        feedback = send_daily_feedback(real_feedback_svc, real_tg, today)
        if feedback:
            print(f"Feedback successfully generated: {feedback.message}")
        else:
            print("Feedback generation returned None")
    except Exception as e:
        print(f"Feedback generation failed: {e}")

if __name__ == '__main__':
    test_scheduler_jobs()
