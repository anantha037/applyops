import requests
import os
import subprocess
import time

proc = subprocess.Popen(["python", "-m", "uvicorn", "backend.main:app", "--port", "8005"], env={**os.environ, "ENV": "production", "ALLOWED_ORIGINS": "*"})
# poll until ready
for _ in range(10):
    try:
        requests.get('http://127.0.0.1:8005/docs')
        break
    except:
        time.sleep(1)

try:
    import uuid
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post('http://127.0.0.1:8005/auth/register', json={'name': 'Test User', 'email':email, 'password':'password123'}, headers={'X-ApplyOps-Client': '1'})
    print("STATUS:", r.status_code)
    print("SET-COOKIE HEADER:")
    for header, value in r.headers.items():
        if header.lower() == 'set-cookie':
            print(value)
finally:
    proc.terminate()
