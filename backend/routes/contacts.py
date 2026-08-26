"""Contacts API routes.

GET  /contacts  — merged view (derived from Applications + Contacts_Manual, deduped by email)
POST /contacts  — create a manual-only contact in Contacts_Manual
"""

from __future__ import annotations

from uuid import uuid4

from fastapi import APIRouter, Depends, Request, status

from backend.auth import get_current_user
from backend.db.models import User
from backend.db.session import get_session

from backend.models import ContactCreate, ContactManual, ContactView, ContactUpdate
from backend import db_client
from backend.db.session import engine
from sqlmodel import Session

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.get("", response_model=list[ContactView])
def list_contacts(request: Request, user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> list[ContactView]:
    """Return all contacts from Postgres, enriched with Activity Log data."""
    return db_client.list_contacts(user.id, session=session)


@router.post("", response_model=ContactManual, status_code=status.HTTP_201_CREATED)
def create_contact(payload: ContactCreate, request: Request, user: User = Depends(get_current_user)) -> ContactManual:
    """Add a manual contact directly to Postgres."""
    with Session(engine) as session:
        # Check for duplicates explicitly before creation
        if payload.email and payload.email.strip():
            norm_email = payload.email.strip().lower()
            from sqlmodel import select, col
            from backend.db.models import Contact
            stmt = select(Contact).where(Contact.user_id == user.id, col(Contact.email).ilike(norm_email))
            existing = session.exec(stmt).first()
            if existing:
                from fastapi import HTTPException
                raise HTTPException(status_code=409, detail="Contact already exists. Would you like to edit the existing one instead?")
                
        try:
            contact = db_client.find_or_create_contact(
                session,
                user.id,
                name=payload.name,
                email=payload.email,
                phone=payload.phone,
                role=payload.role,
                company=payload.company,
                linkedin_url=payload.linkedin_url,
                tags=payload.tags,
                notes=payload.notes,
                application_id=payload.application_id,
            )
        except ValueError as e:
            if "unauthorized" in str(e).lower():
                raise HTTPException(status_code=403, detail=str(e))
            raise HTTPException(status_code=400, detail=str(e))
        session.commit()
        session.refresh(contact)
        return ContactManual(
            id=contact.id,
            name=contact.name or "",
            company=contact.company or "",
            role=contact.role or "",
            email=contact.email or "",
            phone=contact.phone or "",
            linkedin_url=contact.linkedin_url or "",
            tags=contact.tags or "",
            notes=contact.notes or "",
            last_action_status="Not Contacted",
            last_action_date=None,
        )


@router.patch("/{contact_id}", response_model=ContactView)
def update_contact(
    contact_id: str,
    payload: ContactUpdate,
    request: Request,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> ContactView:
    """Update a contact's fields."""
    try:
        updated = db_client.update_contact(user.id, contact_id, payload.model_dump(exclude_unset=True), session=session)
    except ValueError as e:
        from fastapi import HTTPException
        if "unauthorized" in str(e).lower():
            raise HTTPException(status_code=403, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Catch IntegrityError for unique constraint violation on email
        if "uq_contact_email" in str(e):
            from fastapi import HTTPException
            raise HTTPException(status_code=409, detail="A contact with this email already exists.")
        raise
        
    if not updated:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Contact not found")
    return updated


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contact(contact_id: str, request: Request, user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> None:
    """Delete a contact if not referenced."""
    from fastapi import HTTPException
    try:
        db_client.delete_contact(user.id, contact_id, session=session)
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail="Contact not found")
        else:
            raise HTTPException(status_code=400, detail=str(e))
