"""Core authentication utilities for ApplyOps — Feature Phase F2.

Provides:
  - Password hashing (bcrypt)
  - JWT access token creation and decoding (python-jose, HS256, 15-minute lifetime)
  - Refresh token creation, rotation, and revocation
    (256-bit random token, SHA-256 hash stored in DB, 7-day lifetime, rotated on use)
  - Rate limiting: lock login per (email, IP) after 5 failures in 15 minutes
  - get_current_user FastAPI dependency (validates Bearer token on every protected request)
  - Password reset token utilities (SHA-256, 1-hour lifetime, single-use)

Token lifecycle
---------------
Access token  : JWT, stateless, 15-minute expiry.  Cannot be individually revoked.
                On logout, the client discards it; it expires naturally within 15 minutes.
Refresh token : opaque random token, SHA-256 hash stored in refresh_tokens table.
                Revoked immediately on logout (server-side).
                Rotated on use: old token is revoked, new token + new access token issued.
                7-day expiry.

Environment variables required
-------------------------------
  JWT_SECRET_KEY  — minimum 32 random characters, never committed to source control.
"""
from __future__ import annotations

import hashlib
import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt as _bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import func
from sqlmodel import Session, select

from backend.db.models import LoginAttempt, PasswordResetToken, RefreshToken, User
from backend.db.session import get_session

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration (read once at import time; hard-fail if missing in production)
# ---------------------------------------------------------------------------

SECRET_KEY: str = os.environ.get("JWT_SECRET_KEY", "")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7
PASSWORD_RESET_EXPIRE_HOURS = 1
RATE_LIMIT_WINDOW_MINUTES = 15
RATE_LIMIT_MAX_ATTEMPTS = 5

# HTTPBearer with auto_error=False so we can return 401 (not 403) for missing tokens.
_bearer = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _sha256(value: str) -> str:
    """SHA-256 hex digest of a string.  Used for opaque token storage."""
    return hashlib.sha256(value.encode()).hexdigest()


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_aware(dt: datetime) -> datetime:
    """Make a datetime timezone-aware (UTC) if it is naive."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------

def hash_password(plain: str) -> str:
    """Return a bcrypt hash of *plain*.  Never store or log the input."""
    return _bcrypt.hashpw(plain.encode(), _bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    """Constant-time bcrypt comparison."""
    return _bcrypt.checkpw(plain.encode(), hashed.encode())


# ---------------------------------------------------------------------------
# Access tokens (JWT)
# ---------------------------------------------------------------------------

def _require_secret() -> str:
    if not SECRET_KEY:
        raise RuntimeError(
            "JWT_SECRET_KEY is not configured. "
            "Set it in .env before starting the application."
        )
    return SECRET_KEY


def create_access_token(user_id: str, email: str) -> str:
    """Create a signed JWT access token valid for ACCESS_TOKEN_EXPIRE_MINUTES."""
    secret = _require_secret()
    expire = _utc_now() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": user_id,
        "email": email,
        "exp": expire,
        "type": "access",
    }
    return jwt.encode(payload, secret, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT access token.  Raises 401 on any failure."""
    secret = _require_secret()
    try:
        payload = jwt.decode(token, secret, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


# ---------------------------------------------------------------------------
# Refresh tokens
# ---------------------------------------------------------------------------

def create_refresh_token(user_id: str, session: Session) -> str:
    """Generate a new refresh token, persist its hash, and return the raw token."""
    raw = secrets.token_urlsafe(32)
    token_hash = _sha256(raw)
    expires = _utc_now() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    rt = RefreshToken(user_id=user_id, token_hash=token_hash, expires_at=expires)
    session.add(rt)
    session.commit()
    return raw


def rotate_refresh_token(raw_token: str, session: Session) -> tuple[str, str]:
    """Validate, revoke old token, and issue a new (refresh, access) pair.

    Returns (new_raw_refresh_token, new_access_token).
    Raises 401 if the token is invalid, expired, or already revoked.
    If a revoked token is presented, this is a compromise signal (token reuse),
    and the entire token family (all refresh tokens for that user) is revoked.
    """
    token_hash = _sha256(raw_token)
    rt = session.exec(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    ).first()

    if not rt or _ensure_aware(rt.expires_at) < _utc_now():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user = session.get(User, rt.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    if rt.revoked:
        # Token Reuse Detected! Revoke the entire family for this user.
        logger.warning("Token reuse detected for user %s! Revoking all refresh tokens.", user.id)
        all_user_tokens = session.exec(
            select(RefreshToken).where(RefreshToken.user_id == user.id)
        ).all()
        for t in all_user_tokens:
            t.revoked = True
            session.add(t)
        session.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token reuse detected. All sessions revoked. Please log in again.",
        )

    # Valid rotation: revoke old token
    rt.revoked = True
    session.add(rt)
    session.commit()

    new_raw = create_refresh_token(user.id, session)
    access = create_access_token(user.id, user.email)
    return new_raw, access


def revoke_refresh_token(raw_token: str, session: Session) -> None:
    """Mark the refresh token as revoked (logout)."""
    token_hash = _sha256(raw_token)
    rt = session.exec(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    ).first()
    if rt:
        rt.revoked = True
        session.add(rt)
        session.commit()


# ---------------------------------------------------------------------------
# Rate limiting
# ---------------------------------------------------------------------------

def check_rate_limit(email: str, ip: str, session: Session) -> None:
    """Raise HTTP 429 if the (email, IP) pair has exceeded the failed-login limit."""
    cutoff = _utc_now() - timedelta(minutes=RATE_LIMIT_WINDOW_MINUTES)
    count = session.exec(
        select(func.count(LoginAttempt.id)).where(
            LoginAttempt.email == email.lower(),
            LoginAttempt.ip_address == ip,
            LoginAttempt.attempted_at >= cutoff,
            LoginAttempt.success == False,  # noqa: E712
        )
    ).one()
    if count >= RATE_LIMIT_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Too many failed login attempts. "
                f"Try again in {RATE_LIMIT_WINDOW_MINUTES} minutes."
            ),
        )


def record_login_attempt(email: str, ip: str, success: bool, session: Session) -> None:
    """Persist one login attempt record for rate-limit tracking."""
    attempt = LoginAttempt(email=email.lower(), ip_address=ip, success=success)
    session.add(attempt)
    session.commit()


# ---------------------------------------------------------------------------
# Password reset tokens
# ---------------------------------------------------------------------------

def create_password_reset_token(user_id: str, session: Session) -> str:
    """Create a single-use password reset token and return the raw value."""
    raw = secrets.token_urlsafe(32)
    token_hash = _sha256(raw)
    expires = _utc_now() + timedelta(hours=PASSWORD_RESET_EXPIRE_HOURS)
    prt = PasswordResetToken(user_id=user_id, token_hash=token_hash, expires_at=expires)
    session.add(prt)
    session.commit()
    return raw


def consume_password_reset_token(
    raw_token: str, session: Session
) -> PasswordResetToken:
    """Validate and return the reset token record.  Does NOT mark it used yet.

    Raises 400 if the token is invalid, expired, or already used.
    Caller must set prt.used_at and commit after updating the password.
    """
    token_hash = _sha256(raw_token)
    prt = session.exec(
        select(PasswordResetToken).where(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.used_at == None,  # noqa: E711
        )
    ).first()
    if not prt or _ensure_aware(prt.expires_at) < _utc_now():
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    return prt


# ---------------------------------------------------------------------------
# FastAPI dependency — get_current_user
# ---------------------------------------------------------------------------

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    session: Session = Depends(get_session),
) -> User:
    """Validate the Bearer JWT and return the authenticated User.

    Raises 401 for missing, malformed, or expired tokens.
    Applied to every route that accesses user-owned data.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(credentials.credentials)
    user_id: Optional[str] = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user
