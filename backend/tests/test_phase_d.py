import sys
import httpx
import time
from uuid import uuid4

# Use the app locally via TestClient or just raw httpx
from fastapi.testclient import TestClient
from backend.main import app
from backend.db.session import engine, SQLModel

# Reset DB for tests? No, it's a live test against whatever is configured.
# Assuming Neon is configured in .env. We shouldn't wipe data.
# We will just create dummy records.

client = TestClient(app)

def test_1():
    print("Test 1: Create application with zero contact info and no resume")
    response = client.post("/applications", json={
        "company": "Test Company 1",
        "job_title": "Software Engineer",
        "status": "Not Contacted",
        "stage": "Applied",
        "date_applied": "2026-08-11",
        "application_method": "Email",
        "jd_summary": "",
        "interview_date": None,
        "interview_round": "",
        "remarks": "",
        "last_touch_date": "2026-08-11"
    })
    assert response.status_code == 201, f"Failed: {response.text}"
    data = response.json()
    assert data["contact_id"] is None, "contact_id should be null"
    assert data["resume_id"] is None, "resume_id should be null"
    print("PASS")
    return data["id"]

def test_2():
    print("Test 2: Create two applications with same HR email -> exactly one Contact")
    email = f"hr_{uuid4()}@example.com"
    
    app1 = client.post("/applications", json={
        "company": "Company A",
        "job_title": "Engineer",
        "status": "Not Contacted",
        "stage": "Applied",
        "date_applied": "2026-08-11",
        "application_method": "Email",
        "interview_round": "",
        "contact_name": "Alice",
        "contact_email": email
    }).json()
    
    app2 = client.post("/applications", json={
        "company": "Company B",
        "job_title": "Engineer 2",
        "status": "Not Contacted",
        "stage": "Applied",
        "date_applied": "2026-08-11",
        "application_method": "Email",
        "interview_round": "",
        "contact_name": "Alice 2", # Different name, same email
        "contact_email": email
    }).json()
    
    assert app1["contact_id"] is not None
    assert app1["contact_id"] == app2["contact_id"], "Should reuse the same contact_id"
    print("PASS")

def test_3():
    print("Test 3: Upload a new PDF -> R2 object + Neon resume row + usable presigned URL")
    with open("dummy.pdf", "wb") as f:
        f.write(b"%PDF-1.4 dummy")
    
    with open("dummy.pdf", "rb") as f:
        response = client.post("/resumes", files={"file": ("dummy.pdf", f, "application/pdf")})
    
    assert response.status_code == 201, f"Failed: {response.text}"
    resume = response.json()
    resume_id = resume["id"]
    assert resume_id is not None
    
    # Check presigned URL
    url_res = client.get(f"/resumes/{resume_id}/url")
    assert url_res.status_code == 200
    presigned_url = url_res.json()["url"]
    assert presigned_url.startswith("http")
    
    # Actually perform an HTTP GET on the generated presigned URL
    print("       -> Fetching presigned URL...")
    download_res = httpx.get(presigned_url)
    assert download_res.status_code == 200, f"Failed to download: {download_res.status_code}"
    
    # Verify content-type and byte count
    content_type = download_res.headers.get("Content-Type", "")
    assert "application/pdf" in content_type, f"Wrong content type: {content_type}"
    assert len(download_res.content) == 14, f"Wrong byte count: {len(download_res.content)}"
    
    print("PASS")
    return resume_id

def test_4(resume_id):
    print("Test 4: Reuse an existing resume -> same resume_id")
    response = client.post("/applications", json={
        "company": "Company C",
        "job_title": "Engineer",
        "status": "Not Contacted",
        "stage": "Applied",
        "date_applied": "2026-08-11",
        "interview_round": "",
        "resume_id": resume_id
    })
    assert response.status_code == 201
    assert response.json()["resume_id"] == resume_id
    
    print("PASS")

def test_5():
    print("Test 5: Confirm migrated data is accessible")
    res = client.get("/applications")
    assert res.status_code == 200
    assert isinstance(res.json(), list)
    
    res = client.get("/contacts")
    assert res.status_code == 200
    assert isinstance(res.json(), list)
    print("PASS")


if __name__ == "__main__":
    try:
        test_1()
        test_2()
        r_id = test_3()
        test_4(r_id)
        test_5()
    except Exception as e:
        print(f"FAIL: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
