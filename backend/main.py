"""ApplyOps FastAPI application entry point."""

from __future__ import annotations

from contextlib import asynccontextmanager
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.llm_feedback import GroqFeedbackService
from backend.routes.applications import router as applications_router
from backend.routes.dashboard import router as dashboard_router
from backend.routes.internal import router as internal_router
from backend.routes.settings import router as settings_router
from backend.scheduler import ApplyOpsScheduler
from backend.sheets_client import SheetsClient
from backend.telegram_bot import TelegramBot


@asynccontextmanager
async def lifespan(app: FastAPI):
    sheets = SheetsClient()
    sheets.ensure_structure()
    app.state.sheets = sheets
    telegram = TelegramBot()
    app.state.telegram = telegram
    app.state.feedback_service = GroqFeedbackService()
    scheduler = ApplyOpsScheduler(sheets, telegram, app.state.feedback_service)
    scheduler.start()
    app.state.scheduler = scheduler
    try:
        yield
    finally:
        scheduler.shutdown()


app = FastAPI(title="ApplyOps API", version="0.1.0", lifespan=lifespan)
allowed_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
app.include_router(applications_router)
app.include_router(dashboard_router)
app.include_router(internal_router)
app.include_router(settings_router)
