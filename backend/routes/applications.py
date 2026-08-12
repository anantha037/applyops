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
from backend import db_client

router = APIRouter(tags=["applications"])


@router.get("/applications", response_model=list[Application])
def list_applications(
    request: Request,
    status: str | None = Query(default=None),
    stage: str | None = Query(default=None),
) -> list[Application]:
    return db_client.list_applications(status=status, stage=stage)


@router.post("/applications", response_model=Application, status_code=status.HTTP_201_CREATED)
def create_application(payload: ApplicationCreate, request: Request) -> Application:
    last_touch_date = payload.last_touch_date or payload.date_applied
    application_data = payload.model_dump()
    application_data["last_touch_date"] = last_touch_date
    application_data["next_action_due"] = calculate_next_action_due(
        ApplicationStage(payload.stage), last_touch_date, payload.status
    )
    application_data["id"] = str(uuid4())
    
    application = db_client.create_application(
        application_data,
        contact_name=payload.contact_name,
        contact_email=payload.contact_email,
        contact_phone=payload.contact_phone,
        contact_role=payload.contact_role,
        resume_id=payload.resume_id,
    )
    
    # Auto-sync calendar events
    db_client.sync_followup_event(
        application.id, application.company, application.next_action_due, lambda: str(uuid4())
    )
    if application.interview_date:
        db_client.sync_interview_event(
            application.id, application.company,
            application.interview_date, application.interview_round,
            lambda: str(uuid4()),
        )
    return application


@router.patch("/applications/{application_id}", response_model=Application)
def update_application(
    application_id: str, payload: ApplicationUpdate, request: Request
) -> Application:
    existing = db_client.get_application(application_id)
    if existing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    changes = payload.model_dump(exclude_unset=True)
    
    # We must calculate next_action_due if relevant fields changed
    if {"stage", "last_touch_date", "status"} & changes.keys():
        stage = ApplicationStage(changes.get("stage", existing.stage))
        last_touch = changes.get("last_touch_date", existing.last_touch_date)
        status_val = changes.get("status", existing.status)
        changes["next_action_due"] = calculate_next_action_due(stage, last_touch, status_val)

    # Extract contact/resume fields before passing to update
    contact_name = changes.pop("contact_name", None)
    contact_email = changes.pop("contact_email", None)
    contact_phone = changes.pop("contact_phone", None)
    contact_role = changes.pop("contact_role", None)
    resume_id = changes.pop("resume_id", None)

    result = db_client.update_application(
        application_id, 
        changes,
        contact_name=contact_name,
        contact_email=contact_email,
        contact_phone=contact_phone,
        contact_role=contact_role,
        resume_id=resume_id,
    )
    if result is None:
        _not_found()
        
    # Auto-sync calendar events whenever relevant fields change
    if {"stage", "last_touch_date", "status", "next_action_due", "interview_date", "interview_round"} & changes.keys():
        db_client.sync_followup_event(
            result.id, result.company, result.next_action_due, lambda: str(uuid4())
        )
        db_client.sync_interview_event(
            result.id, result.company,
            result.interview_date, result.interview_round or "",
            lambda: str(uuid4()),
        )
    return result


@router.delete("/applications/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(application_id: str, request: Request) -> None:
    if not db_client.delete_application(application_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")


@router.post("/activity", response_model=Activity, status_code=status.HTTP_201_CREATED)
def create_activity(payload: ActivityCreate, request: Request) -> Activity:
    return db_client.create_activity(str(uuid4()), payload)


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
    return db_client.list_activity(activity_date)


def _not_found() -> None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
