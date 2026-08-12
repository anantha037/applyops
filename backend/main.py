"""ApplyOps FastAPI application entry point."""

from __future__ import annotations

from contextlib import asynccontextmanager
import os

from backend.auth import get_current_user
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.llm_feedback import GroqFeedbackService
from backend.routes.analytics import router as analytics_router
from backend.routes.applications import router as applications_router
from backend.routes.auth import router as auth_router
from backend.routes.calendar import router as calendar_router
from backend.routes.contacts import router as contacts_router
from backend.routes.dashboard import router as dashboard_router
from backend.routes.internal import router as internal_router
from backend.routes.reports import router as reports_router
from backend.routes.resumes import router as resumes_router
from backend.routes.settings import router as settings_router
from backend.scheduler import ApplyOpsScheduler
from backend.telegram_bot import TelegramBot


@asynccontextmanager
async def lifespan(app: FastAPI):
    telegram = TelegramBot()
    app.state.telegram = telegram
    app.state.feedback_service = GroqFeedbackService()
    scheduler = ApplyOpsScheduler(telegram, app.state.feedback_service)
    scheduler.start()
    app.state.scheduler = scheduler
    try:
        yield
    finally:
        scheduler.shutdown()


app = FastAPI(title="ApplyOps API", version="0.1.0", lifespan=lifespan)

from fastapi import Request
from fastapi.responses import JSONResponse

@app.middleware("http")
async def csrf_protection(request: Request, call_next):
    if request.method in ("POST", "PUT", "PATCH", "DELETE"):
        # The internal scheduler endpoints use a different mechanism (INTERNAL_API_KEY)
        if not request.url.path.startswith("/internal"):
            # Require custom anti-CSRF header for all mutating API requests, except in tests
            import sys
            if "pytest" not in sys.modules:
                if not request.headers.get("x-applyops-client"):
                    return JSONResponse(
                        status_code=403,
                        content={"detail": "CSRF validation failed: missing custom client header."}
                    )
    return await call_next(request)

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
app.include_router(auth_router)
app.include_router(analytics_router, dependencies=[Depends(get_current_user)])
app.include_router(applications_router, dependencies=[Depends(get_current_user)])
app.include_router(calendar_router, dependencies=[Depends(get_current_user)])
app.include_router(contacts_router, dependencies=[Depends(get_current_user)])
app.include_router(dashboard_router, dependencies=[Depends(get_current_user)])
app.include_router(internal_router)
app.include_router(reports_router, dependencies=[Depends(get_current_user)])
app.include_router(resumes_router, dependencies=[Depends(get_current_user)])
app.include_router(settings_router, dependencies=[Depends(get_current_user)])
