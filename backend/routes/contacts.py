"""Contacts API routes.

GET  /contacts  — merged view (derived from Applications + Contacts_Manual, deduped by email)
POST /contacts  — create a manual-only contact in Contacts_Manual
"""

from __future__ import annotations

from uuid import uuid4

from fastapi import APIRouter, Depends, Request, status

from backend.auth import get_current_user
from backend.db.models import User

from backend.models import ContactCreate, ContactManual, ContactView
from backend import db_client
from backend.db.session import engine
from sqlmodel import Session

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.get("", response_model=list[ContactView])
def list_contacts(request: Request, user: User = Depends(get_current_user)) -> list[ContactView]:
    """Return all contacts from Postgres, enriched with Activity Log data."""
    return db_client.list_contacts(user.id)


@router.post("", response_model=ContactManual, status_code=status.HTTP_201_CREATED)
def create_contact(payload: ContactCreate, request: Request, user: User = Depends(get_current_user)) -> ContactManual:
    """Add a manual contact directly to Postgres.
    
    Uses find_or_create_contact so it correctly deduplicates if the contact
    already exists via an application.
    """
    with Session(engine) as session:
        contact = db_client.find_or_create_contact(
            session,
            user.id,
            name=payload.name,
            email=payload.email,
            phone=payload.phone,
            role=payload.role,
            company=payload.company,
        )
        session.commit()
        session.refresh(contact)
        return ContactManual(
            id=contact.id,
            name=contact.name or "",
            company=contact.company or "",
            role=contact.role or "",
            email=contact.email or "",
            phone=contact.phone or "",
            tags="",
            notes="",
            last_action_status="Not Contacted",
            last_action_date=None,
        )


@router.patch("/{contact_id}", response_model=ContactView)
def update_contact(
    contact_id: str,
    payload: dict,
    request: Request,
    user: User = Depends(get_current_user)
) -> ContactView:
    """Update a contact's fields."""
    updated = db_client.update_contact(user.id, contact_id, payload)
    if not updated:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Contact not found")
    return updated
