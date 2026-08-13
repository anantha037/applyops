from fastapi.testclient import TestClient
from backend.main import app
from backend.db.models import User, Application as DBApplication
from sqlmodel import Session, select
from backend.db.engine import engine
from backend.auth import create_access_token

def get_token():
    with Session(engine) as session:
        user = session.exec(select(User)).first()
        if not user:
            return None, None
        token = create_access_token(data={"sub": user.email})
        return user.id, token

user_id, token = get_token()
if not user_id:
    print("No users found")
    exit(1)

client = TestClient(app)
client.cookies = {"access_token": token}

with Session(engine) as session:
    app_db = session.exec(select(DBApplication).where(DBApplication.user_id == user_id)).first()

if not app_db:
    print("No apps found")
    exit(1)

print(f"Original stage: {app_db.stage}")

res = client.patch(f"/applications/{app_db.id}", json={"stage": "Technical Interview"})
print(f"Status: {res.status_code}")
print(f"Response: {res.json()}")
