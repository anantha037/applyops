"""ApplyOps FastAPI application entry point."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from backend.routes.applications import router as applications_router
from backend.sheets_client import SheetsClient


@asynccontextmanager
async def lifespan(app: FastAPI):
    sheets = SheetsClient()
    sheets.ensure_structure()
    app.state.sheets = sheets
    yield


app = FastAPI(title="ApplyOps API", version="0.1.0", lifespan=lifespan)
app.include_router(applications_router)
