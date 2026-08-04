from datetime import date
from types import SimpleNamespace

import pytest

from backend.llm_feedback import GroqFeedbackService, build_coaching_prompt, coaching_direction
from backend.models import DailyCoachingInput


def stats(**overrides: object) -> DailyCoachingInput:
    values: dict[str, object] = {
        "date": date(2026, 8, 5),
        "goal": 12,
        "applications_logged_today": 0,
        "calls_made_today": 3,
        "responses_today": 1,
        "streak_days": 4,
        "remarks_today": [],
    }
    values.update(overrides)
    return DailyCoachingInput(**values)


@pytest.mark.parametrize(
    ("daily_stats", "expected_direction"),
    [
        (stats(applications_logged_today=12), "genuinely encouraging and specific"),
        (stats(applications_logged_today=5), "firm and direct about the gap"),
        (
            stats(applications_logged_today=5, remarks_today=["Technical interview at 2pm"]),
            "Acknowledge the legitimate context",
        ),
    ],
)
def test_prompt_selects_fair_direction_for_each_daily_scenario(
    daily_stats: DailyCoachingInput, expected_direction: str
) -> None:
    assert expected_direction in coaching_direction(daily_stats)
    prompt = build_coaching_prompt(daily_stats)
    assert expected_direction in prompt
    assert '"applications_logged_today"' in prompt


class FakeCompletions:
    def __init__(self) -> None:
        self.calls: list[dict[str, object]] = []

    def create(self, **kwargs: object) -> SimpleNamespace:
        self.calls.append(kwargs)
        long_message = " ".join(f"word{number}" for number in range(45))
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=long_message))])


def test_generate_makes_one_groq_call_and_limits_message_to_40_words() -> None:
    completions = FakeCompletions()
    client = SimpleNamespace(chat=SimpleNamespace(completions=completions))
    service = GroqFeedbackService(api_key="test-key", client=client, model="test-model")

    feedback = service.generate(stats(applications_logged_today=12))

    assert len(completions.calls) == 1
    assert completions.calls[0]["model"] == "test-model"
    assert len(feedback.message.split()) == 40
