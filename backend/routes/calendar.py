"""Calendar Events API routes."""

from __future__ import annotations

from datetime import date
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query, Request, status

from backend.models import (
    CalendarEvent,
    CalendarEventCreate,
    CalendarEventSource,
    CalendarEventUpdate,
)
from backend.sheets_client import SheetsClient

router = APIRouter(prefix="/calendar", tags=["calendar"])


def _sheets(request: Request) -> SheetsClient:
    return request.app.state.sheets


@router.get("/events", response_model=list[CalendarEvent])
def list_events(
    request: Request,
    start: date | None = Query(default=None),
    end:   date | None = Query(default=None),
) -> list[CalendarEvent]:
    """Return all calendar events, optionally filtered to a date range."""
    return _sheets(request).list_calendar_events(start=start, end=end)


@router.post("/events", response_model=CalendarEvent, status_code=status.HTTP_201_CREATED)
def create_event(payload: CalendarEventCreate, request: Request) -> CalendarEvent:
    """Create a manual calendar event (Personal / Reminder / Application Deadline)."""
    event = CalendarEvent(
        id=str(uuid4()),
        **payload.model_dump(),
        # Force source to Manual regardless of what the client sent — auto events
        # are created exclusively via the application sync hooks, never this endpoint.
    )
    # Override source to MANUAL — this endpoint is only for manual events.
    event = event.model_copy(update={"source": CalendarEventSource.MANUAL})
    return _sheets(request).create_calendar_event(event)


@router.patch("/events/{event_id}", response_model=CalendarEvent)
def update_event(
    event_id: str, payload: CalendarEventUpdate, request: Request
) -> CalendarEvent:
    sheets = _sheets(request)
    existing = sheets.get_calendar_event(event_id)
    if existing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Calendar event not found")

    changes = payload.model_dump(exclude_unset=True)
    # `event_date` in the update payload maps to `date` on the persisted model
    if "event_date" in changes:
        changes["date"] = changes.pop("event_date")
    updated = existing.model_copy(update=changes)
    result = sheets.update_calendar_event(updated)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Calendar event not found")
    return result


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(event_id: str, request: Request) -> None:
    if not _sheets(request).delete_calendar_event(event_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Calendar event not found")
