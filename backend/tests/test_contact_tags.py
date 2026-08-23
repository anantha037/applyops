import os
import time
from fastapi.testclient import TestClient
from backend.main import app
from backend.db.session import engine
from sqlmodel import Session, text

client = TestClient(app)
headers = {"X-ApplyOps-Client": "true"}

def login():
    email = f"test_{int(time.time())}@example.com"
    password = "password123"
    client.post("/auth/register", json={"name": "Test User", "email": email, "password": password}, headers=headers)
    client.post("/auth/login", json={"email": email, "password": password}, headers=headers)
    return email

email = login()

print("1. Create contact 1 with tags='Recruiter'")
res1 = client.post("/contacts", json={
    "name": "Jane Doe",
    "email": "jane@example.com",
    "company": "Test Co 1",
    "tags": "Recruiter"
}, headers=headers)
contact_id = res1.json().get("id")
print(f"Created Contact ID: {contact_id}")
print(f"Tags saved: {res1.json().get('tags')}")

print("\n2. Submit an application (or just create another contact) with same email but tags='Hiring Manager'")
res2 = client.post("/contacts", json={
    "name": "Jane Doe",
    "email": "jane@example.com",
    "company": "Test Co 1",
    "tags": "Hiring Manager"
}, headers=headers)
print(f"Reused Contact ID: {res2.json().get('id')}")
print(f"Tags returned on second creation: {res2.json().get('tags')}")

print("\n3. Verify from database (GET /contacts)")
res3 = client.get("/contacts", headers=headers)
jane = next((c for c in res3.json() if c["id"] == contact_id), None)
if jane:
    print(f"Tags preserved in DB: {jane.get('tags')}")
else:
    print("Contact not found!")
