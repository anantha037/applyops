from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.models import Activity, ActivityCreate, Application
from backend.routes.applications import router


class FakeSheetsClient:
    def __init__(self) -> None:
        self.applications: dict[str, Application] = {}
        self.activities: list[Activity] = []

    def list_applications(self, status: str | None = None, stage: str | None = None) -> list[Application]:
        return [
            application for application in self.applications.values()
            if (status is None or application.status == status)
            and (stage is None or application.stage == stage)
        ]

    def create_application(self, application: Application) -> Application:
        self.applications[application.id] = application
        return application

    def get_application(self, application_id: str) -> Application | None:
        return self.applications.get(application_id)

    def update_application(self, application: Application) -> Application | None:
        if application.id not in self.applications:
            return None
        self.applications[application.id] = application
        return application

    def delete_application(self, application_id: str) -> bool:
        return self.applications.pop(application_id, None) is not None

    def create_activity(self, activity_id: str, payload: ActivityCreate) -> Activity:
        activity = Activity(id=activity_id, timestamp="2026-08-05T12:00:00+00:00", **payload.model_dump())
        self.activities.append(activity)
        return activity

    def list_activity(self, _activity_date) -> list[Activity]:
        return self.activities

    # Stubs for calendar auto-sync — not under test here; see test_calendar_sync.py
    def sync_followup_event(self, *args, **kwargs) -> None:
        pass

    def sync_interview_event(self, *args, **kwargs) -> None:
        pass


def test_application_crud_and_activity_routes() -> None:
    app = FastAPI()
    app.state.sheets = FakeSheetsClient()
    app.include_router(router)
    client = TestClient(app)

    create_response = client.post("/applications", json={"company": "Acme", "job_title": "Engineer"})
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["next_action_due"] == "2026-08-07"

    patch_response = client.patch(
        f"/applications/{created['id']}", json={"stage": "Called", "last_touch_date": "2026-08-06"}
    )
    assert patch_response.status_code == 200
    assert patch_response.json()["next_action_due"] == "2026-08-09"

    activity_response = client.post(
        "/activity", json={"application_id": created["id"], "company": "Acme", "action_type": "Called"}
    )
    assert activity_response.status_code == 201
    assert client.get("/activity?date=today").json()[0]["company"] == "Acme"

    assert client.delete(f"/applications/{created['id']}").status_code == 204
    assert client.get("/applications").json() == []
