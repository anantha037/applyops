import sys
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

endpoints = [
    "/dashboard/summary",
    "/dashboard/due-today",
    "/dashboard/daily-report",
    "/applications",
    "/contacts",
    "/calendar/events",
    "/analytics/overview",
    "/settings"
]

for ep in endpoints:
    res = client.get(ep)
    print(f"Testing {ep}: {res.status_code}")
    if res.status_code != 200:
        print(f"FAIL: {res.text}")
        sys.exit(1)

print("ALL PASSED")
