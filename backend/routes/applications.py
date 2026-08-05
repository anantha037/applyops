"""Application and activity API routes."""

from __future__ import annotations

from datetime import date
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query, Request, status

from backend.models import (
    Activity,
    ActivityCreate,
    Application,
    ApplicationCreate,
    ApplicationStage,
    ApplicationUpdate,
    calculate_next_action_due,
)
from backend.sheets_client import SheetsClient

router = APIRouter(tags=["applications"])


def _sheets(request: Request) -> SheetsClient:
    return request.app.state.sheets


@router.get("/applications", response_model=list[Application])
def list_applications(
    request: Request,
    status: str | None = Query(default=None),
    stage: str | None = Query(default=None),
) -> list[Application]:
    return _sheets(request).list_applications(status=status, stage=stage)


@router.post("/applications", response_model=Application, status_code=status.HTTP_201_CREATED)
def create_application(payload: ApplicationCreate, request: Request) -> Application:
    last_touch_date = payload.last_touch_date or payload.date_applied
    application_data = payload.model_dump()
    application_data["last_touch_date"] = last_touch_date
    application_data["next_action_due"] = calculate_next_action_due(
        ApplicationStage(payload.stage), last_touch_date, payload.status
    )
    application = Application(
        id=str(uuid4()),
        **application_data,
    )
    sheets = _sheets(request)
    sheets.create_application(application)
    # Auto-sync calendar events
    sheets.sync_followup_event(
        application.id, application.company, application.next_action_due, lambda: str(uuid4())
    )
    if application.interview_date:
        sheets.sync_interview_event(
            application.id, application.company,
            application.interview_date, application.interview_round,
            lambda: str(uuid4()),
        )
    return application


@router.patch("/applications/{application_id}", response_model=Application)
def update_application(
    application_id: str, payload: ApplicationUpdate, request: Request
) -> Application:
    sheets = _sheets(request)
    existing = sheets.get_application(application_id)
    if existing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    changes = payload.model_dump(exclude_unset=True)
    updated = existing.model_copy(update=changes)
    if {"stage", "last_touch_date", "status"} & changes.keys():
        updated.next_action_due = calculate_next_action_due(
            ApplicationStage(updated.stage), updated.last_touch_date, updated.status
        )
    result = sheets.update_application(updated)
    if result is None:
        _not_found()
    # Auto-sync calendar events whenever relevant fields change
    if {"stage", "last_touch_date", "status", "next_action_due", "interview_date", "interview_round"} & changes.keys():
        sheets.sync_followup_event(
            updated.id, updated.company, updated.next_action_due, lambda: str(uuid4())
        )
        sheets.sync_interview_event(
            updated.id, updated.company,
            updated.interview_date, updated.interview_round or "",
            lambda: str(uuid4()),
        )
    return result


@router.delete("/applications/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(application_id: str, request: Request) -> None:
    if not _sheets(request).delete_application(application_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")


@router.post("/activity", response_model=Activity, status_code=status.HTTP_201_CREATED)
def create_activity(payload: ActivityCreate, request: Request) -> Activity:
    return _sheets(request).create_activity(str(uuid4()), payload)


@router.get("/activity", response_model=list[Activity])
def list_activity(
    request: Request, date_filter: str = Query(default="today", alias="date")
) -> list[Activity]:
    if date_filter == "today":
        activity_date = date.today()
    else:
        try:
            activity_date = date.fromisoformat(date_filter)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="date must be 'today' or an ISO date (YYYY-MM-DD)",
            ) from exc
    return _sheets(request).list_activity(activity_date)


def _not_found() -> None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
