"""add_users_table_and_user_id_columns

Feature Phase F1 — Multi-user authentication schema.

What this migration does
------------------------
1. Creates the `users` table (id, email UNIQUE, password_hash, created_at).
2. Adds a nullable `user_id` TEXT column (FK → users.id) to every
   user-owned table: contacts, resumes, applications, activity_log,
   calendar_events, daily_snapshots, settings.
3. Drops the single-column UNIQUE constraint on daily_snapshots.snapshot_date
   (replaced later by a composite UNIQUE on (user_id, snapshot_date) once
   NOT NULL is enforced by the owner-setup CLI).
4. Adds a UNIQUE constraint on settings.user_id (NULL-safe in Postgres —
   multiple NULLs are allowed; only non-NULL values must be unique).

What this migration deliberately does NOT do
--------------------------------------------
- Does NOT enforce NOT NULL on user_id columns yet.
  Existing rows would violate NOT NULL immediately.
  The one-time `backend/scripts/setup_owner.py` CLI handles:
    a. Creating the owner user row.
    b. Backfilling every existing row's user_id.
    c. ALTERing each column to NOT NULL.
    d. Adding the composite UNIQUE on (user_id, snapshot_date).
- Does NOT delete or truncate any existing data.
- Does NOT reset any sequences.

Downgrade is fully reversible
------------------------------
`alembic downgrade -1` (or `alembic downgrade ddd951aba6b0`) will:
- Drop user_id FK constraints + columns from all 7 tables.
- Restore the single-column UNIQUE on daily_snapshots.snapshot_date.
- Drop the UNIQUE on settings.user_id.
- Drop the `users` table.

Revision ID: d2a0a78a6d2b
Revises: ddd951aba6b0
Create Date: 2026-08-13
"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel
from alembic import op

revision: str = "d2a0a78a6d2b"
down_revision: Union[str, Sequence[str], None] = "ddd951aba6b0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Tables that get a plain user_id column (no other structural changes).
_USER_OWNED_TABLES = [
    "contacts",
    "resumes",
    "applications",
    "activity_log",
    "calendar_events",
    "daily_snapshots",
    "settings",
]


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. Create users table
    # ------------------------------------------------------------------
    op.create_table(
        "users",
        sa.Column("id", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("email", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("password_hash", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_index("ix_users_email_lower", "users", [sa.text("lower(email)")], unique=True)

    # ------------------------------------------------------------------
    # 2. Add nullable user_id to every user-owned table
    # ------------------------------------------------------------------
    for table in _USER_OWNED_TABLES:
        op.add_column(
            table,
            sa.Column("user_id", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        )
        op.create_foreign_key(
            f"fk_{table}_user_id",
            table, "users",
            ["user_id"], ["id"],
        )
        op.create_index(f"ix_{table}_user_id", table, ["user_id"])

    # ------------------------------------------------------------------
    # 3. Drop single-column unique on daily_snapshots.snapshot_date
    #    (will be replaced by composite unique after NOT NULL is enforced)
    # ------------------------------------------------------------------
    op.drop_constraint("daily_snapshots_snapshot_date_key", "daily_snapshots", type_="unique")

    # ------------------------------------------------------------------
    # 4. Add UNIQUE on settings.user_id
    #    (NULL-safe — existing NULL row doesn't conflict)
    # ------------------------------------------------------------------
    op.create_unique_constraint("uq_settings_user_id", "settings", ["user_id"])


def downgrade() -> None:
    # Reverse in opposite order.

    # 4. Drop UNIQUE on settings.user_id
    op.drop_constraint("uq_settings_user_id", "settings", type_="unique")

    # 3. Restore single-column unique on daily_snapshots.snapshot_date
    op.create_unique_constraint(
        "daily_snapshots_snapshot_date_key", "daily_snapshots", ["snapshot_date"]
    )

    # 2. Drop user_id FK constraints, indexes, and columns (reverse order)
    for table in reversed(_USER_OWNED_TABLES):
        op.drop_index(f"ix_{table}_user_id", table_name=table)
        op.drop_constraint(f"fk_{table}_user_id", table, type_="foreignkey")
        op.drop_column(table, "user_id")

    # 1. Drop users table + its index
    op.drop_index("ix_users_email_lower", table_name="users")
    op.drop_table("users")
