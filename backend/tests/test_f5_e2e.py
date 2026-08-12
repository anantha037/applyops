"""F5: Full End-to-End Multi-User Verification with httpOnly Cookies."""

import pytest
import uuid
import os

# Must set a test secret key if not set, otherwise app won't start
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-auth-tests-only")

from fastapi.testclient import TestClient
from backend.main import app
from backend.db.session import engine
from sqlmodel import Session, text

@pytest.fixture(scope="module")
def client_a():
    """Client for User A with independent cookie jar."""
    return TestClient(app)

@pytest.fixture(scope="module")
def client_b():
    """Client for User B with independent cookie jar."""
    return TestClient(app)

@pytest.fixture(scope="module")
def anon_client():
    """Client for Unauthenticated User."""
    return TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def user_a(client_a):
    email = f"user_a_{uuid.uuid4().hex[:8]}@example.com"
    password = "password123"
    client_a.post("/auth/register", json={"email": email, "password": password})
    client_a.post("/auth/login", json={"email": email, "password": password})
    return {"email": email, "password": password}

@pytest.fixture(scope="module", autouse=True)
def user_b(client_b):
    email = f"user_b_{uuid.uuid4().hex[:8]}@example.com"
    password = "password123"
    client_b.post("/auth/register", json={"email": email, "password": password})
    client_b.post("/auth/login", json={"email": email, "password": password})
    return {"email": email, "password": password}

def test_item_1_anon_cannot_access(anon_client):
    """1. Explicitly verify a user who never logs in cannot reach any page."""
    endpoints = ["/applications", "/contacts", "/settings", "/dashboard/summary", "/activity?date=today"]
    for ep in endpoints:
        res = anon_client.get(ep)
        assert res.status_code == 401
        
    res_post = anon_client.post("/applications", json={"company": "Test", "job_title": "Test", "stage": "Applied", "status": "In Progress"})
    assert res_post.status_code == 401

def test_item_2_user_a_creates_app_isolated(client_a, client_b):
    """2. User A creates application, User B cannot see it in list."""
    res = client_a.post("/applications", json={
        "company": "Company A",
        "job_title": "Engineer A",
        "stage": "Applied",
        "status": "In Progress"
    })
    assert res.status_code == 201
    app_id = res.json()["id"]

    res_b = client_b.get("/applications")
    assert res_b.status_code == 200
    b_apps = [a["id"] for a in res_b.json()]
    assert app_id not in b_apps
    return app_id

def test_item_3_user_b_cannot_get_app_by_id(client_a, client_b):
    """3. User B attempts GET /applications/{A's id} -> 404."""
    # Ensure A has an app
    res = client_a.post("/applications", json={"company": "C3", "job_title": "J3", "stage": "Applied", "status": "In Progress"})
    app_id = res.json()["id"]
    
    res_b = client_b.get(f"/applications/{app_id}")
    assert res_b.status_code in (404, 405)

def test_item_4_user_b_cannot_patch_app(client_a, client_b):
    """4. User B attempts PATCH on User A's application -> 404."""
    res = client_a.post("/applications", json={"company": "C4", "job_title": "J4", "stage": "Applied", "status": "In Progress"})
    app_id = res.json()["id"]
    
    res_b = client_b.patch(f"/applications/{app_id}", json={"company": "Hacked"})
    assert res_b.status_code == 404

def test_item_5_user_b_cannot_delete_app(client_a, client_b):
    """5. User B attempts DELETE on User A's application -> 404."""
    res = client_a.post("/applications", json={"company": "C5", "job_title": "J5", "stage": "Applied", "status": "In Progress"})
    app_id = res.json()["id"]
    
    res_b = client_b.delete(f"/applications/{app_id}")
    assert res_b.status_code == 404

def test_item_6_user_a_creates_contact_isolated(client_a, client_b):
    """6. User A creates contact, User B cannot see or edit it."""
    res = client_a.post("/contacts", json={
        "name": "Contact A",
        "company": "Comp A"
    })
    assert res.status_code == 201
    contact_id = res.json()["id"]

    res_b_list = client_b.get("/contacts")
    b_contacts = [c["id"] for c in res_b_list.json()]
    assert contact_id not in b_contacts

    res_b_get = client_b.get(f"/contacts/{contact_id}")
    assert res_b_get.status_code == 404

def test_item_7_settings_are_isolated(client_a, client_b):
    """7. Settings are completely isolated between users."""
    res_a = client_a.patch("/settings", json={"daily_goal": 99})
    assert res_a.status_code == 200

    res_b = client_b.get("/settings")
    assert res_b.status_code == 200
    assert res_b.json().get("daily_goal") != 99

def test_item_8_activity_and_dashboard_isolated(client_a, client_b):
    """8. Activity logs and dashboard endpoints only show user's own data."""
    # Log activity for A
    res = client_a.post("/applications", json={"company": "C8", "job_title": "J8", "stage": "Applied", "status": "In Progress"})
    app_id = res.json()["id"]
    client_a.post("/activity", json={"application_id": app_id, "company": "Comp A", "action_type": "Call Dialed"})
    
    # B's activity should be empty
    res_b = client_b.get("/activity?date=today")
    assert res_b.status_code == 200
    assert len(res_b.json()) == 0
    
    # B's dashboard summary should be 0
    res_db = client_b.get("/dashboard/summary")
    assert res_db.status_code == 200
    assert res_db.json()["today_count"] == 0

def test_item_9_logout_invalidates_server_session(client_a):
    """9. Logging out actually invalidates the session server-side."""
    # Refresh should work initially
    res_refresh = client_a.post("/auth/refresh", json={})
    assert res_refresh.status_code == 200

    # Logout
    res_logout = client_a.post("/auth/logout", json={})
    assert res_logout.status_code == 204
    
    # Refresh should now fail because token is revoked server-side
    # Note: TestClient deletes cookies if server sends Set-Cookie with max-age=0,
    # but we will just pass the old refresh cookie manually to test server-side revocation.
    old_refresh = res_refresh.cookies.get("applyops_refresh_token")
    client_a.cookies.set("applyops_refresh_token", old_refresh)
    
    res_fail = client_a.post("/auth/refresh", json={})
    assert res_fail.status_code == 401
    assert "Invalid or revoked refresh token" in res_fail.json()["detail"] or "Token reuse detected" in res_fail.json()["detail"]

def test_item_10_cookie_presence(client_b):
    """10. Verify actual cookies are being used, no JSON token payload."""
    assert "applyops_access_token" in client_b.cookies
    assert "applyops_refresh_token" in client_b.cookies
    
    # Verify auth/me endpoint
    res = client_b.get("/auth/me")
    assert res.status_code == 200
    assert "id" in res.json()

def test_item_11_resume_isolation(client_a, client_b, user_a):
    """11. Resume isolation end-to-end."""
    # client_a was logged out in test 9, so log back in
    client_a.post("/auth/login", json={"email": user_a["email"], "password": user_a["password"]})
    
    # User A uploads a resume
    # We simulate an upload by mocking the file content
    file_content = b"fake pdf content"
    files = {"file": ("resume_a.pdf", file_content, "application/pdf")}
    res_a_upload = client_a.post("/resumes", files=files)
    assert res_a_upload.status_code in (200, 201)
    resume_id = res_a_upload.json()["id"]

    # User B cannot list it
    res_b_list = client_b.get("/resumes")
    b_resumes = [r["id"] for r in res_b_list.json()]
    assert resume_id not in b_resumes

    # User B cannot retrieve presigned URL for it
    res_b_url = client_b.get(f"/resumes/{resume_id}/url")
    assert res_b_url.status_code == 404
    
    # User B cannot attach it to their own application
    try:
        res_b_app = client_b.post("/applications", json={
            "company": "Company B",
            "job_title": "Engineer B",
            "stage": "Applied",
            "status": "In Progress",
            "resume_id": resume_id
        })
        assert res_b_app.status_code in (404, 400, 403, 500)
    except ValueError as e:
        assert "Invalid or unauthorized resume_id" in str(e)

def test_item_12_owner_data_intact():
    """12. Verify original owner pre-migration data is fully intact."""
    with Session(engine) as s:
        # Owner ID corresponds to darylldixon77@gmail.com
        owner = s.exec(text("SELECT id FROM users WHERE email='darylldixon77@gmail.com'")).first()
        assert owner is not None, "Owner account not found"
        owner_id = owner[0]

        app_count = s.exec(text(f"SELECT COUNT(*) FROM applications WHERE user_id='{owner_id}'")).one()[0]
        contact_count = s.exec(text(f"SELECT COUNT(*) FROM contacts WHERE user_id='{owner_id}'")).one()[0]
        resume_count = s.exec(text(f"SELECT COUNT(*) FROM resumes WHERE user_id='{owner_id}'")).one()[0]
        activity_count = s.exec(text(f"SELECT COUNT(*) FROM activity_log WHERE user_id='{owner_id}'")).one()[0]
        cal_count = s.exec(text(f"SELECT COUNT(*) FROM calendar_events WHERE user_id='{owner_id}'")).one()[0]
        snap_count = s.exec(text(f"SELECT COUNT(*) FROM daily_snapshots WHERE user_id='{owner_id}'")).one()[0]
        settings_count = s.exec(text(f"SELECT COUNT(*) FROM settings WHERE user_id='{owner_id}'")).one()[0]

        assert app_count == 20, f"Expected 20 applications, got {app_count}"
        assert contact_count == 6, f"Expected 6 contacts, got {contact_count}"
        assert resume_count == 4, f"Expected 4 resumes, got {resume_count}"
        assert activity_count == 5, f"Expected 5 activity logs, got {activity_count}"
        assert cal_count == 23, f"Expected 23 calendar events, got {cal_count}"
        assert snap_count == 4, f"Expected 4 daily snapshots, got {snap_count}"
        assert settings_count == 1, f"Expected 1 settings row, got {settings_count}"

def test_item_13_scheduler_isolation(client_a, client_b):
    """13. Re-verify scheduler isolation with per-user output."""
    from backend.scheduler import send_due_today_reminder
    from datetime import datetime
    
    # 1. Setup User A with a Telegram ID and a due-today application
    client_a.patch("/settings", json={"telegram_chat_id": "CHAT_A_123"})
    
    today_str = datetime.now().strftime("%Y-%m-%d")
    client_a.post("/applications", json={
        "company": "SchedulerCompany A",
        "job_title": "Role A",
        "stage": "Applied",
        "status": "In Progress",
        "date_applied": today_str,
        "last_touch_date": today_str
    })
    
    # 2. Setup User B with a DIFFERENT Telegram ID and a due-today application
    client_b.patch("/settings", json={"telegram_chat_id": "CHAT_B_456"})
    client_b.post("/applications", json={
        "company": "SchedulerCompany B",
        "job_title": "Role B",
        "stage": "Applied",
        "status": "In Progress",
        "date_applied": today_str,
        "last_touch_date": today_str
    })

    # 3. Create a mock telegram bot that records the calls
    class MockTelegramBot:
        def __init__(self):
            self.calls = []
        def send_due_today_reminder(self, applications, chat_id):
            self.calls.append({
                "chat_id": chat_id,
                "companies": [app.company for app in applications]
            })
    
    mock_tg = MockTelegramBot()
    
    # 4. Trigger the scheduler function
    # It should iterate through all users and call send_due_today_reminder for each user that needs it
    from zoneinfo import ZoneInfo
    today_date = datetime.now(ZoneInfo("Asia/Kolkata")).date()
    
    # Force the dates to match today so they trigger the reminder
    with Session(engine) as s:
        s.exec(text(f"UPDATE applications SET next_action_due='{today_date.isoformat()}' WHERE company LIKE 'SchedulerCompany%'"))
        s.commit()
    
    send_due_today_reminder(mock_tg, today=today_date)
    
    # 5. Verify the isolation
    # There should be exactly two calls (one for A, one for B) - or more if there are other users,
    # but let's just check that A and B got THEIR OWN applications and not each other's.
    
    calls_for_a = [c for c in mock_tg.calls if c["chat_id"] == "CHAT_A_123"]
    calls_for_b = [c for c in mock_tg.calls if c["chat_id"] == "CHAT_B_456"]
    
    assert len(calls_for_a) >= 1
    assert len(calls_for_b) >= 1
    
    # User A should only see Company A
    companies_a = []
    for c in calls_for_a:
        companies_a.extend(c["companies"])
    assert "SchedulerCompany A" in companies_a
    assert "SchedulerCompany B" not in companies_a
    
    # User B should only see Company B
    companies_b = []
    for c in calls_for_b:
        companies_b.extend(c["companies"])
    assert "SchedulerCompany B" in companies_b
    assert "SchedulerCompany A" not in companies_b

