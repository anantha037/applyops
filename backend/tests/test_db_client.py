"""Integration tests for the Phase B repository layer.

Tests run against the REAL Neon database and the REAL R2 bucket.
Every test cleans up after itself — no orphan rows or objects left behind.

Run with:
    pytest backend/tests/test_db_client.py -v

Requirements:
    DATABASE_URL, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME must all be set in .env.

Test coverage:
    Contact find-or-create (6 scenarios):
        1. Same email across two applications → exactly one contact row, both linked.
        2. Different email → two distinct contact rows created.
        3. No contact info → contact_id stays None.
        4. Name + phone fallback (no email) → matching works, no duplicate created.
        5. Existing contact with blank fields → new values fill blanks on reuse.
        6. Existing contact with populated fields → existing values never overwritten.

    Resume repository:
        7. upload_resume() → R2 object exists, Postgres row exists, storage_key correct.
        8. list_resumes() → returns the uploaded resume.
        9. get_resume_presigned_url() → returns a URL, unknown ID returns None.
        10. Cleanup: delete_resume() removes both R2 object and Postgres row.
        11. Size validation: file > 10 MB raises ValueError.
        12. Extension validation: non-PDF raises ValueError.
"""

from __future__ import annotations

import io
import uuid
from datetime import date

import pytest
from sqlmodel import Session, select

from backend.db.models import Contact, Application as DBApplication, Resume
from backend.db.session import engine
from backend.db_client import (
    create_application,
    delete_application,
    delete_resume,
    find_or_create_contact,
    get_resume_presigned_url,
    list_resumes,
    upload_resume,
)
from backend.r2_client import R2_BUCKET_NAME, get_r2_client


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_app_payload(company: str = "TestCo") -> dict:
    return {
        "date_applied":       date.today(),
        "company":            company,
        "job_title":          "Software Engineer",
        "status":             "Not Contacted",
        "stage":              "Applied",
    }


def _unique() -> str:
    """Unique tag to avoid cross-test collisions."""
    return uuid.uuid4().hex[:8]


def _cleanup_app(app_id: str) -> None:
    """Remove application row without caring about contact_id."""
    delete_application(app_id)


def _cleanup_contact(contact_id: str) -> None:
    with Session(engine) as session:
        row = session.get(Contact, contact_id)
        if row:
            session.delete(row)
            session.commit()


# ---------------------------------------------------------------------------
# Contact find-or-create tests
# ---------------------------------------------------------------------------

class TestFindOrCreateContact:
    """Six scenarios from SPEC §10 contact-linkage requirements."""

    # 1 ── same email → one contact, two apps both linked
    def test_same_email_creates_one_contact(self) -> None:
        tag   = _unique()
        email = f"hr_{tag}@company.com"
        app_ids: list[str] = []

        try:
            a1 = create_application(
                _make_app_payload("CompanyA"),
                contact_name="Alice HR", contact_email=email,
            )
            app_ids.append(a1.id)

            a2 = create_application(
                _make_app_payload("CompanyA"),
                contact_name="Alice HR", contact_email=email,
            )
            app_ids.append(a2.id)

            with Session(engine) as session:
                # Exactly one contact for this email
                contacts = session.exec(
                    select(Contact).where(Contact.email == email)
                ).all()
                assert len(contacts) == 1, (
                    f"Expected 1 contact for {email!r}, got {len(contacts)}"
                )

                # Both applications reference the same contact_id
                rows = [session.get(DBApplication, aid) for aid in app_ids]
                cids = {r.contact_id for r in rows if r}
                assert len(cids) == 1, (
                    f"Both applications should share one contact_id, got {cids}"
                )
                assert cids != {None}, "contact_id should not be None"

        finally:
            # Collect contact_id before deleting anything
            shared_cid: str | None = None
            with Session(engine) as session:
                for aid in app_ids:
                    app = session.get(DBApplication, aid)
                    if app and app.contact_id:
                        shared_cid = app.contact_id
                        break

            # Delete all applications first (FK references contact)
            for aid in app_ids:
                with Session(engine) as session:
                    app = session.get(DBApplication, aid)
                    if app:
                        session.delete(app)
                        session.commit()

            # Then delete the shared contact
            if shared_cid:
                _cleanup_contact(shared_cid)

    # 2 ── different emails → two separate contacts
    def test_different_emails_create_two_contacts(self) -> None:
        tag    = _unique()
        email1 = f"hr1_{tag}@company.com"
        email2 = f"hr2_{tag}@company.com"
        app_ids: list[str] = []
        contact_ids: list[str] = []

        try:
            a1 = create_application(
                _make_app_payload("CompanyB"),
                contact_name="Bob", contact_email=email1,
            )
            app_ids.append(a1.id)

            a2 = create_application(
                _make_app_payload("CompanyC"),
                contact_name="Carol", contact_email=email2,
            )
            app_ids.append(a2.id)

            with Session(engine) as session:
                for aid, email in zip(app_ids, [email1, email2]):
                    row = session.get(DBApplication, aid)
                    assert row is not None
                    assert row.contact_id is not None
                    contact_ids.append(row.contact_id)

            assert contact_ids[0] != contact_ids[1], (
                "Different emails should produce different contact rows"
            )

        finally:
            for aid in app_ids:
                with Session(engine) as session:
                    app = session.get(DBApplication, aid)
                    if app:
                        session.delete(app)
                        session.commit()
            for cid in contact_ids:
                _cleanup_contact(cid)

    # 3 ── no contact info → contact_id remains None
    def test_no_contact_info_leaves_null(self) -> None:
        app = create_application(_make_app_payload("CompanyD"))
        try:
            with Session(engine) as session:
                row = session.get(DBApplication, app.id)
                assert row is not None
                assert row.contact_id is None, (
                    f"contact_id should be None when no contact info provided, got {row.contact_id!r}"
                )
        finally:
            _cleanup_app(app.id)

    # 4 ── name + phone fallback (no email)
    def test_name_phone_fallback_deduplicates(self) -> None:
        tag   = _unique()
        name  = f"Dave_{tag}"
        phone = f"+91{tag[:10]}"
        app_ids: list[str] = []

        try:
            a1 = create_application(
                _make_app_payload("CompanyE"),
                contact_name=name, contact_phone=phone,
            )
            app_ids.append(a1.id)

            a2 = create_application(
                _make_app_payload("CompanyE"),
                contact_name=name, contact_phone=phone,
            )
            app_ids.append(a2.id)

            with Session(engine) as session:
                rows = [session.get(DBApplication, aid) for aid in app_ids]
                cids = {r.contact_id for r in rows if r}
                assert len(cids) == 1, (
                    f"Name+phone match should produce one contact, got {cids}"
                )
                assert None not in cids

        finally:
            cid_to_delete: str | None = None
            for aid in app_ids:
                with Session(engine) as session:
                    app = session.get(DBApplication, aid)
                    if app:
                        cid_to_delete = app.contact_id
                        session.delete(app)
                        session.commit()
            if cid_to_delete:
                _cleanup_contact(cid_to_delete)

    # 5 ── blank fields on existing contact are filled
    def test_blank_fields_are_filled_on_reuse(self) -> None:
        tag   = _unique()
        email = f"eve_{tag}@company.com"

        try:
            # First app: creates contact with only name + email, phone blank
            a1 = create_application(
                _make_app_payload("CompanyF"),
                contact_name="Eve", contact_email=email,
            )

            with Session(engine) as session:
                row1 = session.get(DBApplication, a1.id)
                assert row1 and row1.contact_id
                cid = row1.contact_id
                contact = session.get(Contact, cid)
                assert contact
                assert not contact.phone   # phone is blank after first app

            # Second app: same email, supplies a phone number
            a2 = create_application(
                _make_app_payload("CompanyF"),
                contact_name="Eve", contact_email=email,
                contact_phone="+919999999999",
            )

            with Session(engine) as session:
                contact = session.get(Contact, cid)
                assert contact
                assert contact.phone == "+919999999999", (
                    f"Blank phone should have been filled, got {contact.phone!r}"
                )

        finally:
            for aid in [a1.id, a2.id]:
                with Session(engine) as session:
                    app = session.get(DBApplication, aid)
                    if app:
                        session.delete(app)
                        session.commit()
            _cleanup_contact(cid)

    # 6 ── populated fields are NOT overwritten
    def test_populated_fields_not_overwritten(self) -> None:
        tag   = _unique()
        email = f"frank_{tag}@company.com"

        try:
            # First app: creates contact with name = "Frank"
            a1 = create_application(
                _make_app_payload("CompanyG"),
                contact_name="Frank", contact_email=email,
            )

            with Session(engine) as session:
                row1 = session.get(DBApplication, a1.id)
                assert row1 and row1.contact_id
                cid = row1.contact_id

            # Second app: same email, tries to change the name to "Franklin"
            a2 = create_application(
                _make_app_payload("CompanyG"),
                contact_name="Franklin", contact_email=email,
            )

            with Session(engine) as session:
                contact = session.get(Contact, cid)
                assert contact
                assert contact.name == "Frank", (
                    f"Existing name 'Frank' should NOT have been overwritten by 'Franklin', "
                    f"got {contact.name!r}"
                )

        finally:
            for aid in [a1.id, a2.id]:
                with Session(engine) as session:
                    app = session.get(DBApplication, aid)
                    if app:
                        session.delete(app)
                        session.commit()
            _cleanup_contact(cid)


# ---------------------------------------------------------------------------
# Resume repository tests
# ---------------------------------------------------------------------------

class TestResumeRepository:

    def _make_pdf_bytes(self, size: int = 1024) -> bytes:
        """Minimal fake PDF bytes."""
        return b"%PDF-1.4\n" + b"x" * size

    # 7 ── upload stores in R2 and Postgres
    def test_upload_resume_stores_in_r2_and_postgres(self) -> None:
        tag  = _unique()
        name = f"resume_{tag}.pdf"
        meta = upload_resume(
            io.BytesIO(self._make_pdf_bytes()),
            name,
            label=f"Test resume {tag}",
        )

        try:
            # Postgres row exists
            with Session(engine) as session:
                row = session.get(Resume, meta.id)
                assert row is not None
                assert row.filename == name
                assert row.storage_key == f"resumes/{meta.id}/{name}"
                assert row.label == f"Test resume {tag}"

            # R2 object exists (head_object won't raise if present)
            client = get_r2_client()
            resp = client.head_object(Bucket=R2_BUCKET_NAME, Key=meta.storage_key)
            assert resp["ResponseMetadata"]["HTTPStatusCode"] == 200

        finally:
            delete_resume(meta.id)

    # 8 ── list_resumes returns the uploaded entry
    def test_list_resumes_includes_upload(self) -> None:
        tag  = _unique()
        meta = upload_resume(io.BytesIO(self._make_pdf_bytes()), f"list_{tag}.pdf")
        try:
            ids = [r.id for r in list_resumes()]
            assert meta.id in ids, f"Uploaded resume {meta.id} not found in list_resumes()"
        finally:
            delete_resume(meta.id)

    # 9 ── presigned URL returned for known ID; None for unknown
    def test_presigned_url(self) -> None:
        tag  = _unique()
        meta = upload_resume(io.BytesIO(self._make_pdf_bytes()), f"url_{tag}.pdf")
        try:
            url = get_resume_presigned_url(meta.id, ttl_seconds=60)
            assert url is not None
            assert meta.storage_key in url, "storage_key should appear in presigned URL"

            missing = get_resume_presigned_url("nonexistent-id-" + tag)
            assert missing is None
        finally:
            delete_resume(meta.id)

    # 10 ── delete_resume removes R2 object and Postgres row
    def test_delete_resume_cleans_up(self) -> None:
        tag  = _unique()
        meta = upload_resume(io.BytesIO(self._make_pdf_bytes()), f"del_{tag}.pdf")
        storage_key = meta.storage_key

        result = delete_resume(meta.id)
        assert result is True

        # Postgres row gone
        with Session(engine) as session:
            assert session.get(Resume, meta.id) is None

        # R2 object gone (NoSuchKey expected)
        client = get_r2_client()
        from botocore.exceptions import ClientError
        with pytest.raises(ClientError):
            client.head_object(Bucket=R2_BUCKET_NAME, Key=storage_key)

    # 11 ── file size > 10 MB raises ValueError
    def test_upload_rejects_oversized_file(self) -> None:
        oversized = io.BytesIO(b"x" * (10 * 1024 * 1024 + 1))
        with pytest.raises(ValueError, match="too large"):
            upload_resume(oversized, "big.pdf")

    # 12 ── non-PDF extension raises ValueError
    def test_upload_rejects_non_pdf(self) -> None:
        with pytest.raises(ValueError, match="PDF"):
            upload_resume(io.BytesIO(b"data"), "resume.docx")
