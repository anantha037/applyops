import os
import time
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)
headers = {"X-ApplyOps-Client": "true"}

def login():
    email = f"test_{int(time.time())}@example.com"
    password = "password123"
    client.post("/auth/register", json={"name": "Test User", "email": email, "password": password}, headers=headers)
    client.post("/auth/login", json={"email": email, "password": password}, headers=headers)

login()

print("J. POST /contacts")
contact_payload = {
    "name": "Test Contact",
    "company": "Test Co",
    "role": "Recruiter",
    "email": "test@test.com",
    "phone": "1234567890",
    "tags": "Recruiter, Tech",
    "notes": "Testing round trip",
    "linkedin_url": "https://linkedin.com/in/test",
    "applied": False,
    "application_method": None
}
res = client.post("/contacts", json=contact_payload, headers=headers)
print(f"Status: {res.status_code}")
print(f"Response: {res.json()}")

contact_id = res.json().get('id')
if contact_id:
    print("\nK. GET /contacts")
    res = client.get("/contacts", headers=headers)
    contacts = res.json()
    created = next((c for c in contacts if c["id"] == contact_id), None)
    print(f"Found created contact in GET list: {created is not None}")
    if created:
        print(f"Tags from GET: {created.get('tags')}")
        print(f"Notes from GET: {created.get('notes')}")
