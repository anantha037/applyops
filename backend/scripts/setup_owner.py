"""One-time owner account setup and historical data backfill.

Feature Phase F1 — run ONCE after `alembic upgrade head`.

What this script does
---------------------
1. Prompts for the owner email and password (password via getpass — never
   echoed, never logged, never stored in plaintext).
2. Hashes the password with bcrypt.
3. Inserts the owner row into `users`.
4. Backfills user_id on every existing row in all 7 user-owned tables.
5. Verifies no rows were deleted and no user_id is still NULL.
6. Enforces NOT NULL on user_id in all 7 tables.
7. Adds the composite UNIQUE constraint on
   (user_id, snapshot_date) for daily_snapshots.
8. Prints a verification summary.

Usage
-----
    cd c:\\Projects\\applyops
    python -m backend.scripts.setup_owner

The script reads DATABASE_URL from .env (or the environment).
Run it exactly once. Re-running will detect the existing owner and abort.

Downgrade note
--------------
If you need to roll back the entire F1 migration:
    alembic downgrade ddd951aba6b0
This is safe ONLY after this script has NOT yet been run (or after you
manually drop the NOT NULL constraints the script adds). The migration
itself only adds nullable columns, so alembic downgrade -1 works cleanly
before this script is run.
"""
from __future__ import annotations

import getpass
import sys
from pathlib import Path

import bcrypt
from dotenv import load_dotenv
from sqlalchemy import text

# Ensure repo root is on path so `backend.*` imports resolve.
_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(_ROOT))

load_dotenv(_ROOT / ".env")

from backend.db.session import engine  # noqa: E402 — after sys.path fixup

_USER_OWNED_TABLES = [
    "contacts",
    "resumes",
    "applications",
    "activity_log",
    "calendar_events",
    "daily_snapshots",
    "settings",
]


def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def main() -> None:
    print("=" * 60)
    print("  ApplyOps — Owner Account Setup (Feature Phase F1)")
    print("=" * 60)
    print()

    with engine.begin() as conn:
        # ----------------------------------------------------------
        # Guard: abort if owner already exists
        # ----------------------------------------------------------
        existing = conn.execute(text("SELECT COUNT(*) FROM users")).scalar()
        if existing and existing > 0:
            print(f"ABORTED: {existing} user(s) already exist in the `users` table.")
            print("This script must only be run once. Exiting.")
            sys.exit(1)

        # ----------------------------------------------------------
        # Gather credentials
        # ----------------------------------------------------------
        print("Enter the owner account details.")
        print("This account will own all existing historical data.\n")

        email = input("Owner email: ").strip().lower()
        if not email or "@" not in email:
            print("ERROR: Invalid email address.")
            sys.exit(1)

        password = getpass.getpass("Owner password (not echoed): ")
        if len(password) < 8:
            print("ERROR: Password must be at least 8 characters.")
            sys.exit(1)

        confirm = getpass.getpass("Confirm password: ")
        if password != confirm:
            print("ERROR: Passwords do not match.")
            sys.exit(1)

        password_hash = _hash_password(password)
        del password, confirm  # immediately discard plaintext

        # ----------------------------------------------------------
        # Record pre-backfill row counts for verification
        # ----------------------------------------------------------
        print("\nRecording pre-backfill row counts...")
        pre_counts: dict[str, int] = {}
        for table in _USER_OWNED_TABLES:
            count = conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar() or 0
            pre_counts[table] = count
            print(f"  {table:<20} {count} row(s)")

        # ----------------------------------------------------------
        # Create owner user
        # ----------------------------------------------------------
        import uuid
        from datetime import datetime, timezone

        owner_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        conn.execute(
            text(
                "INSERT INTO users (id, email, password_hash, created_at) "
                "VALUES (:id, :email, :hash, :now)"
            ),
            {"id": owner_id, "email": email, "hash": password_hash, "now": now},
        )
        print(f"\nCreated owner user: {email} (id={owner_id})")

        # ----------------------------------------------------------
        # Backfill user_id on all 7 tables
        # ----------------------------------------------------------
        print("\nBackfilling user_id on all user-owned tables...")
        for table in _USER_OWNED_TABLES:
            result = conn.execute(
                text(f"UPDATE {table} SET user_id = :uid WHERE user_id IS NULL"),
                {"uid": owner_id},
            )
            print(f"  {table:<20} {result.rowcount} row(s) updated")

        # ----------------------------------------------------------
        # Verify: row counts unchanged, no NULL user_id remains
        # ----------------------------------------------------------
        print("\nVerifying backfill...")
        errors: list[str] = []
        for table in _USER_OWNED_TABLES:
            total = conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar() or 0
            nulls = (
                conn.execute(
                    text(f"SELECT COUNT(*) FROM {table} WHERE user_id IS NULL")
                ).scalar()
                or 0
            )
            if total != pre_counts[table]:
                errors.append(
                    f"{table}: expected {pre_counts[table]} rows, found {total}"
                )
            if nulls > 0:
                errors.append(f"{table}: {nulls} row(s) still have user_id = NULL")
            status = "OK" if (total == pre_counts[table] and nulls == 0) else "FAIL"
            print(f"  {table:<20} total={total}  nulls={nulls}  {status}")

        if errors:
            print("\nERRORS detected — rolling back:")
            for e in errors:
                print(f"  {e}")
            raise RuntimeError("Backfill verification failed — transaction rolled back.")

        # ----------------------------------------------------------
        # Enforce NOT NULL on user_id in all 7 tables
        # ----------------------------------------------------------
        print("\nEnforcing NOT NULL on user_id columns...")
        for table in _USER_OWNED_TABLES:
            conn.execute(
                text(
                    f"ALTER TABLE {table} ALTER COLUMN user_id SET NOT NULL"
                )
            )
            print(f"  {table:<20} NOT NULL enforced")

        # ----------------------------------------------------------
        # Add composite unique on daily_snapshots(user_id, snapshot_date)
        # ----------------------------------------------------------
        print("\nAdding composite UNIQUE on daily_snapshots(user_id, snapshot_date)...")
        conn.execute(
            text(
                "ALTER TABLE daily_snapshots "
                "ADD CONSTRAINT uq_snapshot_user_date "
                "UNIQUE (user_id, snapshot_date)"
            )
        )
        print("  uq_snapshot_user_date constraint added")

        # ----------------------------------------------------------
        # Final summary
        # ----------------------------------------------------------
        print("\n" + "=" * 60)
        print("  SETUP COMPLETE")
        print("=" * 60)
        print(f"  Owner:  {email}")
        print(f"  UserID: {owner_id}")
        print()
        for table in _USER_OWNED_TABLES:
            count = conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar() or 0
            print(f"  {table:<20} {count} row(s)  [owner={owner_id[:8]}...]")
        print()
        print("  All existing data is owned by the owner account.")
        print("  You can now proceed to Feature Phase F2 (backend auth).")


if __name__ == "__main__":
    main()
