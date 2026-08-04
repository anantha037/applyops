"""Single-call Groq daily coaching integration."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from groq import Groq

from backend.models import DailyCoachingInput, DailyFeedback

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant"


class FeedbackConfigurationError(RuntimeError):
    """Raised when the Groq key needed for daily coaching is missing."""


def coaching_direction(stats: DailyCoachingInput) -> str:
    """Choose the explicit fairness instruction for the day's result."""
    if stats.goal == 0:
        return "Acknowledge the effort shown in the metrics without judging goal completion."
    if stats.applications_logged_today >= stats.goal * 0.8:
        return "Be genuinely encouraging and specific about the strong result."
    if stats.remarks_today:
        return "Acknowledge the legitimate context in the remarks and do not criticize the missed goal."
    return "Be firm and direct about the gap, without being harsh or guilt-inducing."


def build_coaching_prompt(stats: DailyCoachingInput) -> str:
    """Build the structured prompt for one short, fair coaching message."""
    data = json.dumps(stats.model_dump(mode="json"), separators=(",", ":"))
    return (
        "You are a direct, encouraging career coach. Write exactly one coaching message under "
        "40 words. Do not use headings, bullet points, or preambles. "
        f"Decision guidance: {coaching_direction(stats)}\n"
        f"Daily metrics: {data}"
    )


class GroqFeedbackService:
    """Generate one daily coaching message with exactly one Groq API call."""

    def __init__(
        self,
        api_key: str | None = None,
        client: Any | None = None,
        model: str | None = None,
    ) -> None:
        resolved_key = api_key or os.getenv("GROQ_API_KEY", "")
        if not resolved_key:
            raise FeedbackConfigurationError("GROQ_API_KEY must be configured in .env")
        self._client = client or Groq(api_key=resolved_key)
        self._model = model or os.getenv("GROQ_MODEL", DEFAULT_GROQ_MODEL)

    def generate(self, stats: DailyCoachingInput) -> DailyFeedback:
        completion = self._client.chat.completions.create(
            model=self._model,
            messages=[{"role": "user", "content": build_coaching_prompt(stats)}],
            temperature=0.4,
            max_tokens=80,
        )
        content = completion.choices[0].message.content or ""
        message = " ".join(content.split()[:40])
        if not message:
            raise RuntimeError("Groq returned an empty daily coaching message")
        return DailyFeedback(date=stats.date, message=message)
