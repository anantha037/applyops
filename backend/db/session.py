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

from dotenv import load_dotenv
from sqlmodel import Session, SQLModel, create_engine

load_dotenv()

_DATABASE_URL: str = os.environ["DATABASE_URL"]

# pool_pre_ping=True: verify connections are alive before use — important when
# Neon wakes from auto-suspend, as the connection may have been severed.
engine = create_engine(
    _DATABASE_URL,
    pool_pre_ping=True,
    echo=False,  # set True locally to debug SQL; never in production
)


def create_all_tables() -> None:
    """Create all SQLModel tables that don't yet exist.

    Called from alembic env.py for autogenerate, and from tests that need
    an in-process schema.  The live application uses `alembic upgrade head`
    instead — do not call this in main.py.
    """
    SQLModel.metadata.create_all(engine)


def get_session():
    """FastAPI dependency that yields a database session.

    Not wired into routes until Migration Phase D.
    """
    with Session(engine) as session:
        yield session
