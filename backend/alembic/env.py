"""Alembic env.py — configured for ApplyOps / SQLModel / Neon.

Key differences from the Alembic default:
- Reads DATABASE_URL from the environment (python-dotenv), NOT from alembic.ini.
  This keeps credentials out of version control.
- Imports all SQLModel table models so that autogenerate can detect them.
- Uses include_schemas=False (single schema, public) to keep things simple.
"""

from __future__ import annotations

import os
import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool
from sqlmodel import SQLModel

# ── path setup ──────────────────────────────────────────────────────────────
# Add the project root (one level up from backend/) to sys.path so that
# `from backend.db.models import ...` resolves correctly when alembic is run
# from the backend/ directory.
HERE = Path(__file__).resolve().parent          # backend/alembic/
BACKEND_DIR = HERE.parent                       # backend/
PROJECT_ROOT = BACKEND_DIR.parent              # applyops/
sys.path.insert(0, str(PROJECT_ROOT))

# ── load env vars ────────────────────────────────────────────────────────────
load_dotenv(PROJECT_ROOT / ".env")

# ── import all table models (must happen before autogenerate) ─────────────────
# Importing the module registers every SQLModel table class with
# SQLModel.metadata, which is what autogenerate inspects.
import backend.db.models  # noqa: F401  (side-effect import)

# ── alembic config ──────────────────────────────────────────────────────────
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Override sqlalchemy.url from the environment — never from alembic.ini.
_database_url = os.environ.get("DATABASE_URL")
if not _database_url:
    raise RuntimeError(
        "DATABASE_URL is not set.  "
        "Add it to .env (use the Neon pooled -pooler hostname)."
    )
config.set_main_option("sqlalchemy.url", _database_url)

# Use SQLModel's shared metadata so autogenerate sees all registered tables.
target_metadata = SQLModel.metadata


# ── offline mode ─────────────────────────────────────────────────────────────

def run_migrations_offline() -> None:
    """Run migrations without connecting to the database.

    Emits SQL to stdout — useful for reviewing what will be applied.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


# ── online mode ──────────────────────────────────────────────────────────────

def run_migrations_online() -> None:
    """Run migrations with a live database connection."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,   # NullPool: safe for migration-time connections
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
