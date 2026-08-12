"""Authentication endpoints — Feature Phase F2.

Routes:
  POST /auth/register              — create account, return token pair
  POST /auth/login                 — verify credentials, return token pair (rate-limited)
  POST /auth/logout                — revoke refresh token server-side
  POST /auth/refresh               — rotate refresh token, issue new pair
  POST /auth/request-password-reset — initiate reset (always 200, no email-existence leakage)
  POST /auth/reset-password        — consume single-use token, set new password

Logout strategy
---------------
Access tokens are stateless JWTs with a 15-minute lifetime.  They cannot be
individually revoked.  Logout revokes the refresh token in the database, which
prevents any new access token from being obtained after logout.  The current
access token remains technically valid for up to 15 minutes after logout.
This is the standard trade-off for stateless JWTs — acceptable given the short
expiry.  For stricter requirements (e.g. immediate invalidation), implement a
token blocklist stored in Redis, which is out of scope for this phase.

Password reset email delivery
------------------------------
LIMITATION: No email provider is configured.  The raw reset token is logged
at WARNING level to the server console for development and testing.  In
production, wire an email provider (e.g. SendGrid, Resend, SES) and replace
the logger.warning call with a real email send.  The endpoint contract
(always 200, token stored in DB, 1-hour expiry, single-use) is production-ready.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel
from sqlmodel import Session, select

from backend.auth import (
    check_rate_limit,
    consume_password_reset_token,
    create_access_token,
    create_password_reset_token,
    create_refresh_token,
    hash_password,
    record_login_attempt,
    revoke_refresh_token,
    rotate_refresh_token,
    verify_password,
)
from backend.db.models import User
from backend.db.session import get_session

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = 900  # seconds (15 min access token)


class RefreshRequest(BaseModel):
    pass  # Token is now in cookie


class PasswordResetRequest(BaseModel):
    email: str


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/register", response_model=TokenResponse, status_code=201)
def register(body: RegisterRequest, response: Response, session: Session = Depends(get_session)):
    """Create a new user account and return a token pair."""
    email = body.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid email address")
    if len(body.password) < 8:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Password must be at least 8 characters")

    # Case-insensitive duplicate check (email is stored lowercase)
    existing = session.exec(select(User).where(User.email == email)).first()
    if existing:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "An account with this email already exists",
        )

    user = User(email=email, password_hash=hash_password(body.password))
    session.add(user)
    session.commit()
    session.refresh(user)

    access = create_access_token(user.id, user.email)
    refresh = create_refresh_token(user.id, session)
    
    _set_auth_cookies(response, access, refresh)
    return TokenResponse(access_token=access, refresh_token=refresh)

def _set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie(
        key="applyops_access_token",
        value=access,
        httponly=True,
        samesite="lax",
        secure=False, # Set to True in production with HTTPS
        max_age=900,
    )
    response.set_cookie(
        key="applyops_refresh_token",
        value=refresh,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=7 * 24 * 3600,
    )


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, request: Request, response: Response, session: Session = Depends(get_session)):
    """Verify credentials and return a token pair.

    Rate-limited: 5 failed attempts per (email, IP) within 15 minutes → 429.
    Returns an identical generic error for wrong email or wrong password to
    prevent email enumeration.
    """
    email = body.email.strip().lower()
    ip = (request.client.host if request.client else "unknown")

    check_rate_limit(email, ip, session)

    _AUTH_ERROR = HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        "Invalid email or password",
        headers={"WWW-Authenticate": "Bearer"},
    )

    user = session.exec(select(User).where(User.email == email)).first()
    if not user or not verify_password(body.password, user.password_hash):
        record_login_attempt(email, ip, success=False, session=session)
        raise _AUTH_ERROR

    record_login_attempt(email, ip, success=True, session=session)
    access = create_access_token(user.id, user.email)
    refresh = create_refresh_token(user.id, session)
    
    _set_auth_cookies(response, access, refresh)
    return TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response, session: Session = Depends(get_session)):
    """Revoke the refresh token server-side.

    The access token expires naturally within 15 minutes.
    See module docstring for logout strategy rationale.
    """
    refresh_token = request.cookies.get("applyops_refresh_token")
    if refresh_token:
        revoke_refresh_token(refresh_token, session)
    
    response.delete_cookie("applyops_access_token")
    response.delete_cookie("applyops_refresh_token")
    return None


@router.post("/refresh", response_model=TokenResponse)
def refresh_token_endpoint(request: Request, response: Response, session: Session = Depends(get_session)):
    """Rotate the refresh token.  Old token is immediately revoked; new pair issued."""
    refresh_token = request.cookies.get("applyops_refresh_token")
    if not refresh_token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing refresh token")
        
    new_refresh, access = rotate_refresh_token(refresh_token, session)
    _set_auth_cookies(response, access, new_refresh)
    return TokenResponse(access_token=access, refresh_token=new_refresh)


@router.post("/request-password-reset", status_code=200)
def request_password_reset(body: PasswordResetRequest, session: Session = Depends(get_session)):
    """Initiate a password reset.

    Always returns 200 — never reveals whether the email exists.

    LIMITATION: Email delivery is stubbed.  The raw token is logged to the
    server console (WARNING level).  Replace with a real email send before
    exposing this to end-users.
    """
    email = body.email.strip().lower()
    user = session.exec(select(User).where(User.email == email)).first()
    if user:
        raw_token = create_password_reset_token(user.id, session)
        # TODO: replace with real email delivery
        logger.warning(
            "PASSWORD RESET TOKEN for %s (dev/test only — send via email in production): %s",
            email,
            raw_token,
        )
    return {"message": "If that email is registered, a reset link has been sent."}


@router.post("/reset-password", status_code=200)
def reset_password(body: PasswordResetConfirm, session: Session = Depends(get_session)):
    """Consume a single-use reset token and set a new password."""
    if len(body.new_password) < 8:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Password must be at least 8 characters")

    prt = consume_password_reset_token(body.token, session)
    user = session.get(User, prt.user_id)
    if not user:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid reset token")

    user.password_hash = hash_password(body.new_password)
    prt.used_at = datetime.now(timezone.utc)
    session.add(user)
    session.add(prt)
    session.commit()
    return {"message": "Password updated successfully."}
