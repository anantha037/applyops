"""Contacts API routes.

GET  /contacts  — merged view (derived from Applications + Contacts_Manual, deduped by email)
POST /contacts  — create a manual-only contact in Contacts_Manual
"""

from __future__ import annotations

from uuid import uuid4

from fastapi import APIRouter, Request, status

from backend.models import ContactCreate, ContactManual, ContactView
from backend import db_client
from backend.db.session import engine
from sqlmodel import Session

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.get("", response_model=list[ContactView])
def list_contacts(request: Request) -> list[ContactView]:
    """Return all contacts from Postgres, enriched with Activity Log data."""
    return db_client.list_contacts()


@router.post("", response_model=ContactManual, status_code=status.HTTP_201_CREATED)
def create_contact(payload: ContactCreate, request: Request) -> ContactManual:
    """Add a manual contact directly to Postgres.
    
    Uses find_or_create_contact so it correctly deduplicates if the contact
    already exists via an application.
    """
    with Session(engine) as session:
        contact = db_client.find_or_create_contact(
            session,
            name=payload.name,
            email=payload.email,
            phone=payload.phone,
            role=payload.role,
            company=payload.company,
        )
        session.commit()
        
    return ContactManual(
        id=contact.id,
        name=contact.name or "",
        company=contact.company or "",
        role=contact.role or "",
        email=contact.email or "",
        phone=contact.phone or "",
        tags="",
        notes=""
    )
