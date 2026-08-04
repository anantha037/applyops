"""Telegram reminder delivery for ApplyOps."""

from __future__ import annotations

import os
from pathlib import Path

import httpx
from dotenv import load_dotenv

from backend.models import Application

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


class TelegramConfigurationError(RuntimeError):
    """Raised when Telegram credentials have not been configured."""


class TelegramBot:
    """Small wrapper around Telegram's sendMessage endpoint."""

    def __init__(self, token: str | None = None, chat_id: str | None = None) -> None:
        self._token = token or os.getenv("TELEGRAM_BOT_TOKEN", "")
        self._chat_id = chat_id or os.getenv("TELEGRAM_CHAT_ID", "")
        if not self._token or not self._chat_id:
            raise TelegramConfigurationError(
                "TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be configured in .env"
            )

    def send_due_today_reminder(self, applications: list[Application]) -> None:
        """Send a concise list of follow-ups due today."""
        if not applications:
            return
        lines = ["ApplyOps — follow-ups due today:"]
        lines.extend(
            f"• {application.company} — {application.job_title} ({application.stage})"
            for application in applications
        )
        self.send_message("\n".join(lines))

    def send_message(self, text: str) -> None:
        response = httpx.post(
            f"https://api.telegram.org/bot{self._token}/sendMessage",
            json={"chat_id": self._chat_id, "text": text},
            timeout=15.0,
        )
        response.raise_for_status()
        payload = response.json()
        if not payload.get("ok"):
            raise RuntimeError(f"Telegram rejected the message: {payload}")
