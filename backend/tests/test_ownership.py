import os
import time
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def login(email):
    password = "password123"
    client.post("/auth/register", json={"name": "Test User", "email": email, "password": password}, headers={"X-ApplyOps-Client": "true"})
    res = client.post("/auth/login", json={"email": email, "password": password}, headers={"X-ApplyOps-Client": "true"})
    return client.cookies

print("--- Testing Cross-User Relationship Boundaries ---")
# 1. Create User A
email_a = f"usera_{int(time.time())}@example.com"
print(f"Creating User A: {email_a}")
client.cookies.clear()
login(email_a)

# Create a contact as User A
res = client.post("/contacts", json={"name": "User A Contact", "company": "A Corp"}, headers={"X-ApplyOps-Client": "true"})
print("Create Contact A Response:", res.status_code, res.json())
contact_a_id = res.json()["id"]
print(f"User A created Contact: {contact_a_id}")

# Create an application as User A
res = client.post("/applications", json={
    "company": "A Corp", 
    "job_title": "A Dev",
    "date_applied": "2024-01-01"
}, headers={"X-ApplyOps-Client": "true"})
app_a_id = res.json()["id"]
print(f"User A created App: {app_a_id}")

# 2. Create User B
email_b = f"userb_{int(time.time())}@example.com"
print(f"\nCreating User B: {email_b}")
client.cookies.clear()
login(email_b)

# User B tries to link their new application to User A's contact
print(f"User B trying to create an application linked to User A's Contact ID: {contact_a_id}")
res = client.post("/applications", json={
    "company": "B Corp", 
    "job_title": "B Dev",
    "date_applied": "2024-01-01",
    "contact_id": contact_a_id
}, headers={"X-ApplyOps-Client": "true"})
print(f"POST /applications -> {res.status_code}")
if res.status_code != 200:
    print(res.json())

# User B creates their own app to try patching
res = client.post("/applications", json={
    "company": "B Corp", 
    "job_title": "B Dev",
    "date_applied": "2024-01-01"
}, headers={"X-ApplyOps-Client": "true"})
app_b_id = res.json()["id"]

print(f"\nUser B trying to patch their app to link to User A's Contact ID: {contact_a_id}")
res = client.patch(f"/applications/{app_b_id}", json={
    "contact_id": contact_a_id
}, headers={"X-ApplyOps-Client": "true"})
print(f"PATCH /applications -> {res.status_code}")
if res.status_code != 200:
    print(res.json())

print(f"\nUser B trying to create calendar event linked to User A's App ID: {app_a_id}")
res = client.post("/calendar/events", json={
    "title": "Stolen Interview",
    "event_type": "Interview",
    "date": "2024-01-01",
    "related_application_id": app_a_id
}, headers={"X-ApplyOps-Client": "true"})
print(f"POST /calendar/events -> {res.status_code}")
if res.status_code != 200:
    print(res.json())
