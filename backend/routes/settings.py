"""Settings endpoints used by the dashboard."""

from fastapi import APIRouter, Request

from backend.models import Settings, SettingsUpdate
from backend.sheets_client import SheetsClient

router = APIRouter(prefix="/settings", tags=["settings"])


def _sheets(request: Request) -> SheetsClient:
    return request.app.state.sheets


@router.get("", response_model=Settings)
def get_settings(request: Request) -> Settings:
    return _sheets(request).get_settings()


@router.patch("", response_model=Settings)
def update_settings(payload: SettingsUpdate, request: Request) -> Settings:
    return _sheets(request).update_settings(payload)
