"""ApplyOps FastAPI application entry point."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from backend.routes.applications import router as applications_router
from backend.routes.dashboard import router as dashboard_router
from backend.routes.internal import router as internal_router
from backend.scheduler import ApplyOpsScheduler
from backend.sheets_client import SheetsClient
from backend.telegram_bot import TelegramBot


@asynccontextmanager
async def lifespan(app: FastAPI):
    sheets = SheetsClient()
    sheets.ensure_structure()
    app.state.sheets = sheets
    scheduler = ApplyOpsScheduler(sheets, TelegramBot())
    scheduler.start()
    app.state.scheduler = scheduler
    try:
        yield
    finally:
        scheduler.shutdown()


app = FastAPI(title="ApplyOps API", version="0.1.0", lifespan=lifespan)
app.include_router(applications_router)
app.include_router(dashboard_router)
app.include_router(internal_router)
