"""Database engine and session factory for ApplyOps.

Uses the Neon **pooled** connection string (DATABASE_URL must point to the
-pooler hostname variant — see SPEC §10 and AGENTS.md).

Usage
-----
    from backend.db.session import get_session

    with Session(engine) as session:
        ...

Or as a FastAPI dependency (Phase D):
    def some_route(session: Session = Depends(get_session)):
        ...
"""

from __future__ import annotations

import os
import time
import logging

from dotenv import load_dotenv
from sqlmodel import Session, SQLModel, create_engine
from sqlalchemy.exc import OperationalError

load_dotenv()

logger = logging.getLogger(__name__)

_DATABASE_URL: str = os.environ["DATABASE_URL"]

# Neon-tuned pool settings:
#   pool_pre_ping      — discard stale connections before use (essential for scale-to-zero)
#   pool_recycle=300   — recycle connections every 5 min, shorter than Neon's idle cutoff
#   pool_size=5        — keep 5 warm connections; Neon pooler supports up to 10 on free tier
#   max_overflow=5     — allow up to 5 burst connections beyond pool_size
engine = create_engine(
    _DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=5,
    max_overflow=5,
    echo=False,  # set True locally to debug SQL; never in production
)


def with_db_retry(fn, retries: int = 3, delay: float = 0.5):
    """Run fn() and retry on transient Neon SSL/wake-up errors.

    Neon free tier scales to zero after ~5 min of inactivity. The very first
    request after a cold-start can hit an SSL EOF mid-handshake while the
    compute node is still waking up. pool_pre_ping invalidates the stale
    connection, but the next fresh connection attempt can also fail if Neon
    hasn't fully resumed yet. Retrying 2-3 times with a short sleep reliably
    bridges that window (~1-2 seconds total).
    """
    last_exc = None
    for attempt in range(retries):
        try:
            return fn()
        except OperationalError as exc:
            msg = str(exc).lower()
            if "ssl" in msg or "eof" in msg or "connection" in msg:
                last_exc = exc
                if attempt < retries - 1:
                    logger.warning(
                        "Neon transient connection error (attempt %d/%d), retrying in %.1fs: %s",
                        attempt + 1, retries, delay, exc.orig
                    )
                    time.sleep(delay)
                    delay *= 2  # exponential backoff: 0.5s → 1s → 2s
                    continue
            raise
    raise last_exc


def create_all_tables() -> None:
    """Create all SQLModel tables that don't yet exist.

    Called from alembic env.py for autogenerate, and from tests that need
    an in-process schema.  The live application uses `alembic upgrade head`
    instead — do not call this in main.py.
    """
    SQLModel.metadata.create_all(engine)


def get_session():
    """FastAPI dependency that yields a database session.

    Retries up to 3 times on transient Neon SSL/wake-up errors before failing.
    On the free tier, Neon pauses compute after ~5 min idle; the first connection
    after a cold-start can hit an SSL EOF mid-handshake. pool_pre_ping catches
    the stale connection and invalidates it, but the fresh connection attempt can
    also fail if Neon hasn't fully resumed. A short retry loop bridges that window.
    """
    retries = 3
    delay = 0.5
    last_exc = None

    for attempt in range(retries):
        try:
            with Session(engine) as session:
                yield session
                return
        except OperationalError as exc:
            msg = str(exc).lower()
            if "ssl" in msg or "eof" in msg or "connection" in msg:
                last_exc = exc
                if attempt < retries - 1:
                    logger.warning(
                        "Neon transient connection error (attempt %d/%d), retrying in %.1fs: %s",
                        attempt + 1, retries, delay, exc.orig
                    )
                    time.sleep(delay)
                    delay *= 2
                    continue
            raise

    raise last_exc
