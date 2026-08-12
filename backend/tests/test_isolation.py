import pytest
from datetime import date
from fastapi.testclient import TestClient
from sqlmodel import Session, select
import uuid
from io import BytesIO

from backend.main import app
from backend.db.session import engine
from backend.db.models import User, Contact, Resume, Application as DBApplication
from backend.auth import create_access_token, hash_password

client = TestClient(app, raise_server_exceptions=False)


def _create_user(session: Session, email: str) -> User:
    user = User(
        id=str(uuid.uuid4()),
        email=email,
        password_hash=hash_password("password")
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture
def test_users():
    with Session(engine) as session:
        # Create users with random emails to prevent unique constraint violations on retry
        uid = uuid.uuid4().hex[:6]
        user_a = _create_user(session, f"userA_{uid}@example.com")
        user_b = _create_user(session, f"userB_{uid}@example.com")
        
        # Get tokens
        token_a = create_access_token(user_a.id, user_a.email)
        token_b = create_access_token(user_b.id, user_b.email)
        
        yield {
            "a": {"user": user_a, "headers": {"Authorization": f"Bearer {token_a}"}},
            "b": {"user": user_b, "headers": {"Authorization": f"Bearer {token_b}"}}
        }
        
        # We don't delete users on teardown because of FK constraints.
        # Random emails ensure test isolation.


def test_contact_isolation_and_find_or_create(test_users):
    headers_a = test_users["a"]["headers"]
    headers_b = test_users["b"]["headers"]
    
    # User A creates contact via application
    res_a = client.post(
        "/applications",
        json={
            "date_applied": str(date.today()),
            "company": "Tech Corp",
            "job_title": "Engineer",
            "contact_email": "hr@techcorp.com",
            "contact_name": "Alice HR"
        },
        headers=headers_a
    )
    assert res_a.status_code == 201
    
    # User B creates contact with same email
    res_b = client.post(
        "/applications",
        json={
            "date_applied": str(date.today()),
            "company": "Tech Corp",
            "job_title": "Engineer",
            "contact_email": "hr@techcorp.com",
            "contact_name": "Alice HR"
        },
        headers=headers_b
    )
    assert res_b.status_code == 201
    
    # Verify in DB there are two rows
    with Session(engine) as session:
        contacts = session.exec(
            select(Contact).where(
                Contact.email == "hr@techcorp.com",
                Contact.user_id.in_([test_users["a"]["user"].id, test_users["b"]["user"].id])
            )
        ).all()
        assert len(contacts) == 2
        user_ids = {c.user_id for c in contacts}
        assert user_ids == {test_users["a"]["user"].id, test_users["b"]["user"].id}


def test_application_list_isolation(test_users):
    headers_a = test_users["a"]["headers"]
    headers_b = test_users["b"]["headers"]
    
    # A creates app
    res_a = client.post("/applications", json={"date_applied": str(date.today()), "company": "Company A", "job_title": "Engineer"}, headers=headers_a)
    assert res_a.status_code == 201
    
    # B creates app
    res_b = client.post("/applications", json={"date_applied": str(date.today()), "company": "Company B", "job_title": "Engineer"}, headers=headers_b)
    assert res_b.status_code == 201
    
    # Verify GET /applications is isolated
    apps_a = client.get("/applications", headers=headers_a).json()
    assert len(apps_a) > 0
    assert all(app["company"] != "Company B" for app in apps_a)
    
    apps_b = client.get("/applications", headers=headers_b).json()
    assert len(apps_b) > 0
    assert all(app["company"] != "Company A" for app in apps_b)


def test_cross_user_application_access(test_users):
    headers_a = test_users["a"]["headers"]
    headers_b = test_users["b"]["headers"]
    
    # A creates app
    res_a = client.post("/applications", json={"date_applied": str(date.today()), "company": "Target Corp", "job_title": "Engineer"}, headers=headers_a)
    app_id = res_a.json()["id"]
    
    # B attempts to patch
    res_patch = client.patch(f"/applications/{app_id}", json={"company": "Hacked"}, headers=headers_b)
    assert res_patch.status_code == 404
    
    # B attempts to delete
    res_del = client.delete(f"/applications/{app_id}", headers=headers_b)
    assert res_del.status_code == 404


def test_cross_user_resume_usage(test_users, monkeypatch):
    # Mock R2 client to avoid real uploads in this test
    class MockR2:
        def put_object(self, *args, **kwargs): pass
    
    from backend import db_client
    monkeypatch.setattr(db_client, "get_r2_client", lambda: MockR2())
    
    headers_a = test_users["a"]["headers"]
    headers_b = test_users["b"]["headers"]
    
    # A uploads resume
    res_a = client.post(
        "/resumes", 
        files={"file": ("test.pdf", b"%PDF-1.4...", "application/pdf")}, 
        headers=headers_a
    )
    assert res_a.status_code == 201
    resume_id = res_a.json()["id"]
    
    # B attempts to use A's resume
    res_b = client.post(
        "/applications", 
        json={"date_applied": str(date.today()), "company": "Corp", "job_title": "Dev", "resume_id": resume_id}, 
        headers=headers_b
    )
    assert res_b.status_code in [400, 500] # Since it raises ValueError, FastAPI returns 500 unless caught
    
    # B attempts to get presigned URL
    res_url = client.get(f"/resumes/{resume_id}/url", headers=headers_b)
    assert res_url.status_code == 404


def test_cross_user_activity_calendar_settings(test_users):
    headers_a = test_users["a"]["headers"]
    headers_b = test_users["b"]["headers"]
    
    # Verify B's activities don't include A's
    client.post("/activity", json={"action_type": "Call Dialed"}, headers=headers_a)
    acts_b = client.get("/activity", headers=headers_b).json()
    assert len(acts_b) == 0
    
    # Verify B's calendar doesn't include A's
    client.post("/calendar/events", json={"date": str(date.today()), "title": "A's Event", "event_type": "Personal"}, headers=headers_a)
    events_b = client.get("/calendar/events", headers=headers_b).json()
    assert len(events_b) == 0
    
    # Verify B's dashboard summary has zero data from A
    summary_b = client.get("/dashboard/summary", headers=headers_b).json()
    assert summary_b["today_count"] == 0
    assert summary_b["funnel"] == {}
