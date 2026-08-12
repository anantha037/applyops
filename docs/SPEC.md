# Project: ApplyOps - Full Build Spec

Full-stack job application command center. Automated follow-up scheduling, phone-based reminders, and LLM-generated daily coaching. Originally built on Google Sheets as the datastore; migrated to Postgres (Neon) — see section 10.

---

## 0. Build tooling

Phases 1-15 built using Codex CLI (GPT-5.6 Terra/Luna). The v2 redesign (section 8) and the Postgres migration (section 10) moved to Antigravity once Codex's weekly quota ran low — see AGENTS.md for current tooling notes.

---

## 1. Architecture

```
project-root/
├── backend/                  (FastAPI)
│   ├── main.py
│   ├── models.py             (Pydantic schemas + enums)
│   ├── sheets_client.py      (Google Sheets read/write layer)
│   ├── scheduler.py          (APScheduler jobs: reminders, follow-up due-check, daily feedback)
│   ├── telegram_bot.py       (reminder delivery)
│   ├── llm_feedback.py       (single Groq API call for the daily coaching message)
│   ├── routes/
│   │   ├── applications.py   (CRUD)
│   │   ├── dashboard.py      (aggregated stats endpoints)
│   │   └── settings.py       (daily goal, working hours config)
│   └── requirements.txt
├── frontend/                  (React + Vite - reuse your frontend-template from the hackathon)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Applications.jsx   (table + add/edit form)
│   │   │   └── Settings.jsx
│   │   ├── components/
│   │   │   ├── GoalRing.jsx
│   │   │   ├── FunnelChart.jsx
│   │   │   ├── DueTodayList.jsx
│   │   │   └── StreakBadge.jsx
│   │   └── api/client.js
│   └── package.json
├── .env.example
└── README.md
```

Backend and frontend as siblings, matching your established project structure from the hackathon setup.

---

## 2. Data model

**Historical note:** this section originally described a dedicated Google Sheet as the datastore. That's now superseded — see section 10 for the Postgres migration. The table/column definitions below are unchanged in substance for most tables, translated 1:1 in section 10 — **except `applications`**, where `hr_name`/`hr_phone`/`hr_email` are replaced by a proper `contact_id` foreign key, and a new `resume_id` foreign key is added. Section 10 has the corrected definition; treat the `applications` table below as historical only.

**Auth note:** this is a single-user personal tool, not multi-tenant. There's no "new user" sign-up - "login" here means a single PIN gate (one value in `.env`, checked on page load) so the dashboard isn't wide open if deployed on a public URL. If you ever want other people to use their own copy of this later, that's a separate v2 (per-user data, real auth) - out of scope for now, keep it single-user.

### Tab 1: Applications (one row = one application)

| Column | Type | Notes |
|---|---|---|
| id | string (UUID) | generated on create |
| date_applied | date | |
| company | string | |
| job_title | string | |
| jd_summary | string | short, 1-2 lines |
| application_method | enum | LinkedIn Easy Apply / Company Website / Indeed / Email / Referral / Cold Call / Other |
| hr_name | string | |
| hr_phone | string | |
| hr_email | string | |
| ctc | string | |
| status | enum | Not Contacted / In Progress / Interviewing / Offer Received / Rejected / Ghosted |
| stage | enum | Applied / Called / Emailed / Follow-up 1 / Follow-up 2 / Follow-up 3 / Closed |
| last_touch_date | date | updated whenever an action is logged |
| next_action_due | date | auto-computed (see section 4) |
| interview_date | date | nullable - date of next/most recent scheduled interview |
| interview_round | string | nullable - e.g. "Technical Round 1" |
| interview_attended | boolean | set true once that interview_date has passed and you attended |
| latest_update | string | free text |
| remarks | string | free text - objections, notes |

### Tab 2: Activity Log (one row = one action event - supports the daily report in section 4)

| Column | Type | Notes |
|---|---|---|
| id | string (UUID) | |
| timestamp | datetime | |
| application_id | string | links back to the Applications row |
| company | string | denormalized for easy reading directly in the sheet |
| action_type | enum | Call Dialed / Call Connected / Email Sent / WhatsApp Sent / Interview Completed |
| notes | string | optional |

Every call attempt, connected call, email, or completed interview gets logged here as its own row - this is what makes "calls dialed today" a countable number distinct from "how many applications exist," since one application can generate several call attempts over its lifetime.

### Tab 3: Settings (single row)
daily_goal | working_hours_start | working_hours_end | telegram_chat_id | dashboard_pin

---

## 3. Backend API endpoints

```
GET    /applications                 -> list all, filterable by status/stage
POST   /applications                 -> create new entry
PATCH  /applications/{id}            -> update (auto-recomputes next_action_due if stage changes)
DELETE /applications/{id}

GET    /dashboard/summary            -> today's count, goal, streak, funnel breakdown
GET    /dashboard/due-today          -> applications where next_action_due == today
GET    /dashboard/daily-report       -> today's report (see section 4 for exact fields)

POST   /activity                     -> log an action event (call dialed/connected, email, whatsapp, interview completed)
GET    /activity?date=today          -> list today's logged actions

GET    /settings                     -> current goal/hours config
PATCH  /settings                     -> update goal/hours

POST   /internal/daily-feedback      -> triggered by scheduler at end of day; generates + sends LLM coaching message
POST   /internal/reminder-check      -> triggered by scheduler at set times; sends Telegram reminder if due-today list is non-empty
```

---

## 4. Core feature logic

### Follow-up scheduler (auto-compute next_action_due)

On every PATCH that changes stage or last_touch_date:
```
if stage == "Applied":      next_action_due = last_touch_date + 2 days   (first call)
if stage == "Called":       next_action_due = last_touch_date + 3 days   (-> follow-up 1, ~day 5 total)
if stage == "Follow-up 1":  next_action_due = last_touch_date + 5 days   (-> follow-up 2, ~day 10 total)
if stage == "Follow-up 2":  next_action_due = last_touch_date + 5 days   (-> follow-up 3)
if stage in ("Follow-up 3", "Closed", "Offer Received", "Rejected"): next_action_due = null
```
Matches your playbook's Day 2 / 5 / 10 cadence.

### Ghosted auto-flag
A daily scheduled job: if status == "In Progress" and next_action_due is more than 3 days in the past with no update, auto-set status = "Ghosted".

### Reminders (Telegram)
- Setup: create a bot via @BotFather, get a token, get your own chat_id (send /start to the bot, read it from the getUpdates API once).
- Scheduled job at your afternoon call window (e.g. 3:00 PM): query due-today, if non-empty, send a message listing which companies need a touch today.
- Scheduled job at end of day (e.g. 9:00 PM): trigger the feedback engine (below) and send its output via Telegram.

### Daily report (computed from Applications + Activity Log)

`GET /dashboard/daily-report` returns:

```
Calls Dialed:              count(Activity Log where action_type = "Call Dialed" and date = today)
Calls Connected:           count(Activity Log where action_type = "Call Connected" and date = today)
Total Applications Sent:   count(Applications where date_applied = today)
  - Easy Apply:            same, filtered application_method = "LinkedIn Easy Apply"
  - Applied via Email:     same, filtered application_method = "Email"
  (breakdown covers every application_method value present today, not just these two)
Interviews Attended Today: count(Activity Log where action_type = "Interview Completed" and date = today)
Total Interviews in Pipeline: count(Applications where stage = "Interviewing" 
                               or (interview_date is not null and interview_date >= today))
```

This is a pure read/aggregation endpoint - it doesn't need its own storage, it just queries the two tabs and counts. Surface it on the dashboard as a "Today's Report" card (see section 5).

### LLM feedback engine
A single Groq API call generates the daily coaching message (see AGENTS.md for why no fallback provider is needed here).

Input to the prompt (structured, computed by backend):
```json
{
  "date": "2026-08-05",
  "goal": 12,
  "applications_logged_today": 7,
  "calls_made_today": 3,
  "responses_today": 1,
  "streak_days": 4,
  "remarks_today": ["had a technical interview at 2pm"]
}
```

Prompt design: instruct the model to act as a direct, encouraging career coach; given the day's stats, write a short message (under 40 words). If the goal was met or nearly met, be genuinely encouraging and specific. If it was clearly missed without a noted reason in remarks, be firm and direct about the gap without being harsh. If remarks explain a legitimate reason (interview, exam, etc.), acknowledge it and do not criticize.

This is the guardrail that keeps the "critique" mode honest and fair rather than a blanket guilt-trip regardless of context.

---

## 5. Dashboard (frontend)

- Today's Goal Ring - applications logged today / daily goal, live-updating
- Due Today panel - list of companies needing action right now, pulled from /dashboard/due-today, each with a one-click "Log action" button
- Funnel chart - Applied -> Contacted -> Interviewing -> Offer, as a simple horizontal bar funnel
- Status breakdown - pie/donut of Not Contacted / In Progress / Ghosted / Rejected / Offer
- Streak badge - consecutive days goal was hit
- Coaching message card - shows the latest LLM-generated feedback message at the top of the dashboard each day
- Today's Report card - Calls Dialed, Calls Connected, Total Applications Sent (with Easy Apply / Email / other method breakdown), Interviews Attended Today, Total Interviews in Pipeline - pulled from /dashboard/daily-report
- Applications table - full sortable/filterable list, inline edit, matching your sheet's columns, with a "Log action" button per row that posts to /activity (call dialed, call connected, email sent, whatsapp sent, interview completed)

---

## 6. External services needed (set these up first, before coding)

1. Google Sheets API - enable the API in Google Cloud Console, create a service account, download the JSON key, share your existing sheet with the service account's email (Editor access). This connects directly to your existing sheet, no data migration needed.
2. Telegram Bot - create via @BotFather (takes about 2 minutes), get bot token plus your chat ID.
3. Groq API key - free tier (you already have this).

---

## 7. Phased build plan

Phase 1 - Backend + Sheets sync (Day 1): FastAPI skeleton, sheets_client.py covering all three tabs (Applications, Activity Log, Settings), Applications CRUD endpoints, Activity Log endpoints (POST /activity, GET /activity), verify read/write against your real sheet including the new application_method and interview fields.

Phase 2 - Scheduler + Telegram (Day 1-2): APScheduler jobs, Telegram bot wired up, test reminder fires correctly at set times, ghosted auto-flag job.

Phase 3 - LLM feedback engine (Day 2): Prompt design, single Groq call, test against a few synthetic daily-stat scenarios (goal met / goal missed / goal missed with valid reason).

Phase 4 - Frontend dashboard (Day 2-3): React + Vite from your template, wire up all dashboard components against the backend API.

Phase 5 - Free hosting deploy: backend on Render (native Python, no Docker), frontend on Vercel, PIN gate added, secrets moved to env-var-based config, external cron (cron-job.org) covering the reminder and daily-coaching triggers since Render's free tier sleeps.

**Redesign & scope expansion (v2) — see section 8 for full detail:**

Phase 6 - Dashboard redesign (frontend only): rebuild to match the dark, gradient-card "command center" reference, using data already available from existing endpoints - no new backend work.

Phase 7 - Applications + Settings restyle (frontend only): light theme with purple/indigo accents, matching the reference screens - visual only, same underlying data and endpoints.

Phase 8 - Calendar backend: new Calendar Events sheet tab, auto-created/updated events from next_action_due and interview_date, CRUD API.

Phase 9 - Calendar frontend: month view, mini calendar, upcoming events list, matching the reference.

Phase 10 - Contacts backend: aggregation endpoint computing contacts from Applications + Activity Log, plus a small Contacts_Manual tab for contacts not tied to any application.

Phase 11 - Contacts frontend: stat cards, tabs by role, searchable table, matching the reference.

Phase 12 - Analytics backend: Daily Snapshots tab written once a day by the scheduler, an overview aggregation endpoint reading that history for trend comparisons.

Phase 13 - Analytics frontend: Overview tab only (funnel, status donut, applications-over-time, source breakdown) - the additional tabs shown in the reference (Interviews/Responses/Sources/Time Analysis/Conversion) are deferred, not built in this pass.

Phase 14 - Reports backend: CSV export endpoint, filterable by date range and data type.

Phase 15 - Reports frontend: simplified layout driven by CSV export rather than the branded chart-heavy PDF report shown in the reference - that's a materially bigger feature deferred for later.

Phase 16 - Use it daily. You don't need to wait for every phase above - Phases 1-5 already make the tool fully usable; 6 onward is visual/scope upgrade layered on top, and can proceed in parallel with actually using the tool.

---

## 8. Redesign & Scope Expansion (v2)

**Design system:** dark sidebar/nav rail is constant across every page (navy background, purple-indigo active-state highlight). Dashboard's content area stays dark, matching the gradient-card reference. Every other page (Applications, Settings, Calendar, Contacts, Analytics, Reports) uses a light content area with the same purple/indigo accent. Full detail lives in AGENTS.md's design system section - read that before any frontend phase below.

**AI Mentor is explicitly out of scope** - it's a full conversational feature distinct from the existing once-a-day coaching message, and the biggest build on the reference list for the least immediate functional payoff. Not building it.

### 8.1 Dashboard v2
Same data sources as the original Dashboard (section 5), restyled and extended with a few more headline stat cards to match the reference: Applications Today, Response Rate, Interviews (count), Offers, Ghosted - each as its own gradient stat card with a trend indicator. Extend `GET /dashboard/summary` to include these values (mostly derivable from data already in Applications - response_rate = contacted-and-responded / total contacted, using Activity Log to determine "responded").

### 8.2 New tab: Calendar Events
| Column | Type | Notes |
|---|---|---|
| id | string (UUID) | |
| title | string | e.g. "TCS - Follow-up 1" |
| event_type | enum | Follow-up / Interview / Application Deadline / Reminder / Personal |
| date | date | |
| time | string | nullable, e.g. "10:30 AM" |
| related_application_id | string | nullable - links back to Applications |
| notes | string | |
| source | enum | Auto / Manual |

**Auto-sync logic:** whenever an Applications row's `next_action_due` or `interview_date` changes, upsert (not duplicate) a matching Calendar Events row keyed by `related_application_id` + `event_type`. If `next_action_due` is cleared (terminal stage), delete the corresponding auto-generated Follow-up event. Manual events (Personal, Reminder, standalone Application Deadline) are created directly via the API and never touched by this sync logic.

**API:**
```
GET    /calendar/events?start=&end=   -> events in a date range
POST   /calendar/events               -> create a manual event
PATCH  /calendar/events/{id}
DELETE /calendar/events/{id}
```

**Frontend:** month/week/day toggle, mini calendar, filterable by event type, upcoming events list. Use an existing calendar component library (e.g. `react-big-calendar` or `FullCalendar`) rather than building a month-grid from scratch - this is a case where a library saves real build time without hurting the design goal.

### 8.3 Contacts — SUPERSEDED, see section 10
The "merged view" approach originally described here (denormalized HR fields on Applications + a separate Contacts_Manual tab, glued together at query time) was a workaround for Sheets not supporting joins. It's been replaced by a proper `contacts` table with real foreign keys, defined in full in section 10 — read that instead. Keeping this note so the history of the decision isn't lost.

~~Contacts are derived primarily from Applications (hr_name/hr_phone/hr_email) plus Activity Log (for last-contacted and response detection), so HR info never has to be maintained in two places. A small manual tab covers contacts not tied to any application yet.~~

~~New tab: **Contacts_Manual** - id, name, company, role, email, phone, tags, notes.~~

**API (superseded, see section 10 for the current contract):**
```
GET  /contacts          -> merged view: derived-from-Applications contacts + Contacts_Manual, deduped by email
POST /contacts          -> add a manual-only contact
```

**Frontend:** stat cards (Total/Active/Responded/Response Rate/Companies Covered), tabs filtering by a `tags` field (Recruiter/HR Manager/Referrer/Other), searchable table. This part is unaffected by the section 10 change — same UI, just backed by a real table now instead of a merge view.

### 8.4 Analytics
New tab: **Daily Snapshots** - written once a day by the existing scheduler (extend the 9 PM job or add a new one), one row per day: date, total_applications, not_contacted, in_progress, interviewing, offer_received, rejected, ghosted, response_rate, calls_dialed, calls_connected, interviews_attended.

Trend comparisons ("18% vs last month") are only meaningful once this has been running for a while - expect this page to look sparse for the first several days, that's expected, not a bug.

**API:**
```
GET /analytics/overview?range=7d|30d|custom   -> current totals + trend deltas computed from Daily Snapshots history
```

**Frontend:** build only the Overview tab from the reference (headline stats, applications-over-time line chart, status donut, applications-by-source breakdown, top companies). The Interviews/Responses/Sources/Time Analysis/Conversion tabs shown in the reference are a future expansion, not part of this phase.

### 8.5 Reports
Scoped to CSV export, not the branded chart-heavy generated-PDF report shown in the reference - that's a real report-generation feature (templating, PDF rendering) worth its own dedicated build later, not something to fold into this pass.

**API:**
```
GET /reports/export?type=applications|activity|full&start=&end=   -> returns a CSV file
```

**Frontend:** a simpler version of the reference layout - a few "templates" (Application Summary, Response Analytics, etc.) that each just trigger a filtered CSV download, plus the same headline stat cards used elsewhere.

---

## 9. Resume framing (once shipped)

A suggested framing once complete: built and deployed a full-stack job-search operations tool - FastAPI + React + Postgres, with an automated follow-up scheduler, Telegram-based reminders, and an LLM-generated daily performance coaching layer (Groq) - used to run and track a live 10-15 company/day outreach campaign.

That is a genuinely distinct portfolio entry - it demonstrates full-stack ownership plus applied LLM usage in a non-RAG, non-chatbot context, which stands out next to LexShield and AlignForge rather than overlapping with them.

---

## 10. Database Migration (Google Sheets → Postgres)

### Why this happened
The Sheets-backed architecture hit a real ceiling, not just an annoyance: `/analytics/overview` was pulling entire Applications and Activity Log tabs into memory on every request just to compute counts, and normal multi-page navigation was enough to blow through Google's Sheets API read-request quota. A 15-second in-memory cache patched the symptom, but the actual problem is architectural — spreadsheets aren't built for concurrent, query-heavy, relational access, which is exactly the access pattern this app now has after the v2 redesign (Applications, Activity Log, Calendar Events, Contacts, Daily Snapshots, all cross-referencing each other).

### Why Postgres, not NoSQL or Redis
- **The data is inherently relational.** Every new table added in the v2 redesign references Applications by ID (Activity Log, Calendar Events, and the Contacts view all key off `application_id`). That's a foreign-key relationship, not a document-shaped one — a relational database models this directly; a document store (MongoDB, Firestore) would just mean re-implementing joins in application code for no benefit, since the schema is fixed and well-understood, not the kind of evolving/schemaless data NoSQL is actually good for.
- **Redis is the wrong tool for the primary store.** Redis is an in-memory cache/store — excellent for exactly the kind of thing the existing 15-second TTL cache already does, wrong for durable primary storage of application history you can't afford to lose on a restart. Keep the in-process cache as-is; it's still useful on top of Postgres to avoid hammering the DB on rapid navigation, it just no longer has to work around a hard external rate limit.
- **Postgres via a serverless provider matches the free-hosting plan already in place.** The backend runs on Render's free tier, which sleeps when idle — a database that also sleeps and wakes on demand (rather than staying billed/running 24/7) fits that shape naturally instead of fighting it.

### Why Neon specifically (over Supabase, over Render's own Postgres)
- **Render's own free Postgres expires** (Render deletes the free database automatically after a fixed window) — disqualifying for data you want to keep long-term, not just during the 14-day sprint.
- **Supabase's free project pauses after a week of inactivity** and needs a manual unpause click in their dashboard to resume — that breaks the automated cron-job.org triggers hitting the backend on a schedule if nobody's used the app in a few days; you'd come back to a paused database and silently failed reminders.
- **Neon's free tier auto-suspends and wakes automatically on the next query** — no manual intervention, no expiry, and it pairs cleanly with Render's own sleep/wake behavior. It also includes built-in connection pooling, which matters here since FastAPI request handlers and the APScheduler background jobs will open connections independently.
- Neon's free tier (500 MB storage, generous compute hours) is comfortably more than this app will ever need — a personal application tracker's data is measured in thousands of rows of text, nowhere near that ceiling.

### New stack additions
- **Database:** PostgreSQL on Neon (free tier) — use the pooled connection string (`-pooler` hostname), not the direct one
- **ORM:** SQLModel (built on SQLAlchemy + Pydantic — unifies the existing Pydantic request/response models with the database layer instead of maintaining two schemas)
- **Migrations:** Alembic
- **New env var:** `DATABASE_URL` (Neon gives you this directly from its dashboard)
- **Sheets/gspread status:** removed from the live application entirely. `gspread` remains only as a dependency of the one-time migration script (section below), not of the running app

### Two structural corrections before building anything (this is why we planned before running prompts)

**1. Contacts becomes a real entity, not a merged view.** Section 8.3's original approach (HR fields duplicated on Applications, glued to a separate manual tab via a query-time merge) was a workaround for Sheets not supporting joins. Postgres supports joins — that workaround is no longer worth its complexity. Applications now optionally reference one Contact by ID; Contacts is the single place HR/recruiter info lives.

**2. Resumes become their own table, referenced by Applications.** Not for version-history bells and whistles — because tailored resumes get reused across similar-role applications (one version for AI/ML roles, another for backend-leaning roles), so this needs to be a small reusable library, not a re-upload-every-time field.

### Corrected schema

#### `contacts`
| Column | Type | Notes |
|---|---|---|
| id | UUID, PK | |
| name | text | |
| company | text, nullable | prefilled from the linked application at creation time; editable independently afterward |
| role | text, nullable | e.g. "Senior Talent Partner" |
| email | text, nullable | primary match key for find-or-create |
| phone | text, nullable | |
| tags | enum, nullable | Recruiter / HR Manager / Referrer / Other - powers the Contacts page tabs |
| notes | text, nullable | |
| created_at | timestamp | |

#### `resumes`
| Column | Type | Notes |
|---|---|---|
| id | UUID, PK | |
| filename | text | original uploaded filename |
| storage_key | text | object key in Cloudflare R2 - never a public URL |
| label | text, nullable | optional nickname, e.g. "AI/ML Generalist v2" |
| uploaded_at | timestamp | |

#### `applications` (changes from section 2's original definition)
- **Remove:** `hr_name`, `hr_phone`, `hr_email` - now lives in `contacts`
- **Add:** `contact_id` (UUID, nullable FK → `contacts.id`) - nullable because not every application has contact details
- **Add:** `resume_id` (UUID, nullable FK → `resumes.id`)
- Everything else unchanged from section 2 (id, date_applied, company, job_title, jd_summary, application_method, ctc, status, stage, last_touch_date, next_action_due, interview_date, interview_round, interview_attended, latest_update, remarks)

#### `activity_log` (one addition)
- **Add:** `contact_id` (UUID, nullable FK → `contacts.id`) - auto-populated from `applications.contact_id` at write time, never user-input directly. Denormalized on purpose: cheap to add now, expensive to retrofit later if "last contacted" queries on the Contacts page need to avoid joining through Applications every time.

### Contact linkage logic (the actual behavior)
This is what makes contact info "optional, and folded into Contacts automatically":

- `POST /applications` accepts optional inline fields: `contact_name`, `contact_email`, `contact_phone`, `contact_role`. None required.
- None provided → `contact_id` stays null, nothing else happens.
- Any provided → **find-or-create**: match an existing contact by `email` (case-insensitive) if given; if no email, fall back to `name` + `phone` together. Match found → link to it, filling any blank fields on the existing contact but never overwriting ones that already have a value. No match → create a new `contacts` row, prefilled `company` from the application, and link it.
- `PATCH /applications/{id}` supports the same fields with the same logic, so editing HR details on an existing application behaves identically to adding them at creation.
- This is the most important piece of business logic in the whole migration - it's what stops the same HR person turning into five duplicate contact rows because their name was typed slightly differently across five applications. Give it the same dedicated test coverage the `next_action_due` calculation got.

### Resumes & file storage (Cloudflare R2, not the database)
PDFs don't belong in Postgres directly - Neon's free tier caps storage at 500MB, and binary blobs bloat backups for no benefit. Store the file in **Cloudflare R2** (free tier: 10GB storage, zero egress fees, S3-compatible so the standard `boto3` client works), and store only `storage_key` in the `resumes` row.

**Why R2 over Supabase Storage:** same reasoning as the database choice - Supabase's whole-project pause after a week of inactivity would take Storage down with it too, not just the database.

**Privacy note:** a resume contains your name, contact info, and work history - don't make the bucket public. Keep it private; the backend generates short-lived **presigned URLs** on demand whenever the frontend needs to display or download one, rather than storing a permanently-accessible link.

**API:**
```
POST /resumes            -> multipart PDF upload; validate content-type + 
                             extension, max 10MB; returns {id, filename, label}
GET  /resumes            -> list previously uploaded resumes (powers the 
                             "reuse an existing resume" dropdown)
GET  /resumes/{id}/url   -> returns a short-lived presigned download URL
```

`POST /applications` and `PATCH /applications/{id}` accept an optional `resume_id` - either from a fresh upload just before, or picked from `GET /resumes` to reuse one.

### Manual setup: Cloudflare R2 (do this alongside the Neon setup)
1. Sign up at cloudflare.com (free) → R2 → create a bucket (e.g. `applyops-resumes`) → **do not** enable public access.
2. R2 → Manage API Tokens → create a token scoped to that bucket (Object Read & Write).
3. Add to `.env`: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`.

### Table mapping (corrected - supersedes the earlier 1:1 mirror)
- `applications` - as corrected above (contact_id + resume_id, no more inline hr_* fields)
- `contacts` - new, replaces the old Contacts_Manual + merge-view design entirely
- `resumes` - new
- `activity_log` - as section 2, plus the denormalized `contact_id`
- `calendar_events` - unchanged from section 8.2
- `daily_snapshots` - unchanged from section 8.4; still the fix for `/analytics/overview`'s performance problem
- `settings` - unchanged

### Migration phases (revised to build the corrected schema directly - run in order, verify each)

**Migration Phase A - Postgres setup + models:**
Set up Neon and Cloudflare R2 per the manual setup steps above. Build SQLModel table definitions and Alembic migrations for the **corrected** schema in this section - `applications`, `contacts`, `resumes`, `activity_log`, `calendar_events`, `daily_snapshots`, `settings` - not a mirror of the old Sheets/Contacts_Manual design. Nothing wired into the live app yet.

Commit each file separately. Tell me how to confirm the tables exist in Neon.

**Migration Phase B - Repository layer + contact/resume logic:**
Build `db_client.py`. Most functions mirror `sheets_client.py`'s names/signatures, but `create_application`/`update_application` need new behavior: implement the find-or-create contact logic described above, and accept an optional `resume_id`. Add `find_or_create_contact()`, `upload_resume()`, `list_resumes()`, `get_resume_presigned_url()`. Still not wired into routes yet.

Write dedicated tests for find-or-create: same contact via matching email across two applications should produce exactly one contacts row; different email should produce a second one; no contact info should leave contact_id null.

Commit each file separately. Tell me how you tested this against real Neon and R2, not mocks.

**Migration Phase C - One-time data migration (with transformation, not just copying):**
Read every row from the existing Google Sheet. For each Applications row with any hr_name/hr_phone/hr_email value, run it through the same find-or-create logic to produce proper contacts rows - dedupe across rows the same way live traffic will (if the same HR email appears on 3 old rows, they share ONE contact after migration). Migrate any existing Contacts_Manual rows the same way, deduped against anything already created from the applications pass. No historical resumes exist - every migrated application gets `resume_id = null`.

Print a comparison after running: sheet row counts vs database row counts per table, plus the contact dedupe count (e.g. "12 HR references collapsed into 8 unique contacts").

Commit each file separately. Do not modify the Google Sheet - it stays as a fallback until Phase D is confirmed.

**Migration Phase D - Cutover:**
Swap every route/service import from `sheets_client` to `db_client`. This is a real rewrite, not a mechanical swap, for two files specifically: `/applications` (add the inline contact fields + resume_id handling to create/update) and `/contacts` (query the real `contacts` table directly, no more merge-view logic). Fix `/analytics/overview` as previously planned - read `daily_snapshots` history for trends, lightweight aggregate queries for today's live numbers, never a full-table pull.

Add the resume upload control to the "New Application" form (upload new PDF, or pick from existing resumes) and a contact-details section that's visibly optional. Remove `gspread`, `GOOGLE_SHEET_ID`, and the service-account env vars from the live app's required config.

Commit each file separately. Tell me how to verify every page - including that adding an application with no contact info still works cleanly, and that adding two applications with the same HR email links both to one contact, not two.

**Migration Phase E - Deployment update:**
Add `DATABASE_URL` and the R2 env vars to Render. Update README with the new required env vars (Sheets-related ones removed). Confirm the deployed backend can actually reach both Neon and R2 from Render's network, not just locally.

---
