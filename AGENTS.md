# AGENTS.md

## Project
ApplyOps — a personal job-application command center: FastAPI backend + React/Vite frontend, backed by a Postgres database (Neon), with Telegram reminders and an LLM-generated daily coaching layer.

Full spec lives at `docs/SPEC.md` — read it before starting any phase below. This file (AGENTS.md) covers conventions and rules; SPEC.md covers the actual feature detail, data model, and API design.

**Note (architecture change):** this project originally used Google Sheets as its datastore. It has since migrated to Postgres — see SPEC.md §10 for the migration detail and rationale. Google Sheets is no longer part of the live application; `gspread` is only used by the one-time migration script.

## Stack & conventions
- Backend: Python 3.x, FastAPI, Pydantic v2 models, type-hinted throughout
- Database: PostgreSQL, hosted on Neon (free tier, serverless, scale-to-zero). ORM: SQLModel (unifies Pydantic validation and the database layer, avoids maintaining two parallel schemas). Migrations: Alembic. Connection: always use Neon's **pooled** connection string (the `-pooler` hostname variant), never the direct one — this app can have multiple concurrent connections from FastAPI request handlers and the APScheduler background jobs, and Neon's native pooling handles that correctly
- File storage: Cloudflare R2 (free tier) for resume PDFs — private bucket, never public. Backend generates short-lived presigned URLs on demand via `boto3` (R2 is S3-compatible). Only `storage_key` lives in Postgres, never the binary file
- Scheduler: APScheduler running inside the FastAPI app process
- Reminders: Telegram Bot API via `httpx` (or `python-telegram-bot` if simpler)
- LLM calls: a single Groq API call (via GROQ_API_KEY in .env) to generate the daily coaching message — no fallback provider needed, this runs once a day and a missed message on an off day isn't costly. If it fails, log the error and skip that day's message rather than retrying elaborately
- Frontend: React + Vite (reuse the frontend-template from the hackathon setup), Tailwind for styling, functional components only
- Folder layout: `backend/` and `frontend/` as siblings at repo root — see SPEC.md §1 for the full tree
- Git workflow: one feature branch per phase, PR into main — same workflow as LexShield/NexusMCP. **Commit granularity: the initial Setup phase can be a single commit. From Phase 1 onward, commit each file separately as it's created or meaningfully changed — never bundle multiple files into one commit.** Use conventional commit messages (`feat:`, `fix:`, `chore:`, `test:`, `docs:`) with a short scope, e.g. `feat(backend): add sheets_client.py for Google Sheets read/write layer`. Do not commit at the very end of a phase in one batch — commit as you go, file by file.
- Testing: pytest coverage for backend logic, especially the `next_action_due` calculation in the follow-up scheduler — this logic is the core value of the whole tool, it must be correct
- Never commit `.env`, service-account JSON keys, database credentials, or API tokens — `.env.example` only, with placeholder values

## Build order — critical rule
Work through the phases in `docs/SPEC.md §7` **one at a time, in order**. Do not start a later phase until the current one is confirmed working against my real Google Sheet / real Telegram bot. At the end of each phase:
1. Summarize exactly what was built
2. List what I need to manually verify (e.g. "check row was added to the actual sheet", "check the Telegram message arrived")
3. Stop and wait for my confirmation before moving to the next phase

## Design direction (Phase 4 — frontend only)
Avoid a generic dashboard-template look — no default Bootstrap-style card grids, no default shadcn look with zero customization. Aim for a clean, data-dense "ops center" feel: dark-mode-first, one clear accent color used sparingly and consistently, tight spacing, real typographic hierarchy built from font-weight and size together (not just size bumps). Reference feel: more "trading terminal" or "mission control" than "SaaS marketing landing page."

## Budget note
I'm running this build on metered Codex credits. Keep implementations focused and avoid unnecessary exploratory back-and-forth — if something is ambiguous, ask a single clarifying question rather than generating multiple speculative versions.
