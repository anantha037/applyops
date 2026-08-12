"""Settings endpoints used by the dashboard."""

from fastapi import APIRouter, Depends, Request

from backend.auth import get_current_user
from backend.db.models import User

from backend.models import Settings, SettingsUpdate
from backend import db_client

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=Settings)
def get_settings(request: Request, user: User = Depends(get_current_user)) -> Settings:
    return db_client.get_settings(user.id)


@router.patch("", response_model=Settings)
def update_settings(payload: SettingsUpdate, request: Request, user: User = Depends(get_current_user)) -> Settings:
    return db_client.update_settings(user.id, payload)
