"""Contacts API routes.

GET  /contacts  — merged view (derived from Applications + Contacts_Manual, deduped by email)
POST /contacts  — create a manual-only contact in Contacts_Manual
"""

from __future__ import annotations

from uuid import uuid4

from fastapi import APIRouter, Request, status

from backend.models import ContactCreate, ContactManual, ContactView
from backend.sheets_client import SheetsClient

router = APIRouter(prefix="/contacts", tags=["contacts"])


def _sheets(request: Request) -> SheetsClient:
    return request.app.state.sheets


@router.get("", response_model=list[ContactView])
def list_contacts(request: Request) -> list[ContactView]:
    """Return the merged, deduplicated contact list enriched with Activity Log data."""
    return _sheets(request).get_contacts_merged()


@router.post("", response_model=ContactManual, status_code=status.HTTP_201_CREATED)
def create_contact(payload: ContactCreate, request: Request) -> ContactManual:
    """Add a manual-only contact to Contacts_Manual.

    This endpoint is for contacts not yet tied to any application.
    When the same person later becomes an HR contact on an application,
    GET /contacts will merge and deduplicate them automatically by email.
    """
    contact = ContactManual(id=str(uuid4()), **payload.model_dump())
    return _sheets(request).create_contact_manual(contact)
