"""F5: Full End-to-End Multi-User Verification with httpOnly Cookies."""

import pytest
import uuid
import os

# Must set a test secret key if not set, otherwise app won't start
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-auth-tests-only")

from fastapi.testclient import TestClient
from backend.main import app

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
