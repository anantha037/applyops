# Project: "ApplyOps" - Full Build Spec

Full-stack job application command center. Replaces manual spreadsheet tracking with a live dashboard, automated follow-up scheduling, phone-based reminders, and LLM-generated daily coaching, kept in sync with an existing Google Sheet.

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

**This connects to a new, dedicated blank Google Sheet — not your existing placement-cell tracker.** That sheet has a locked, formula-driven Dashboard tab and a column schema that doesn't match what this tool needs, and it's a shared institutional document not worth the risk of restructuring. ApplyOps gets its own sheet, shared with the same service account, with three tabs built fresh: Applications, Activity Log, and Settings. No separate database needed at this scale - a sheet handles thousands of rows fine.

**Auth note:** this is a single-user personal tool, not multi-tenant. There's no "new user" sign-up - "login" here means a single PIN gate (one value in `.env`, checked on page load) so the dashboard isn't wide open if deployed on a public Cloud Run URL. If you ever want other people to use their own copy of this later, that's a separate v2 (per-user sheet linking, real auth) - out of scope for now, keep it single-user.

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

### 8.3 Contacts (computed view, not duplicated data)
Contacts are derived primarily from Applications (hr_name/hr_phone/hr_email) plus Activity Log (for last-contacted and response detection), so HR info never has to be maintained in two places. A small manual tab covers contacts not tied to any application yet.

New tab: **Contacts_Manual** - id, name, company, role, email, phone, tags, notes.

**API:**
```
GET  /contacts          -> merged view: derived-from-Applications contacts + Contacts_Manual, deduped by email
POST /contacts          -> add a manual-only contact
```

**Frontend:** stat cards (Total/Active/Responded/Response Rate/Companies Covered), tabs filtering by a `tags` field (Recruiter/HR Manager/Referrer/Other), searchable table.

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

A suggested framing once complete: built and deployed a full-stack job-search operations tool - FastAPI + React, with two-way Google Sheets sync, an automated follow-up scheduler, Telegram-based reminders, and an LLM-generated daily performance coaching layer (Groq) - used to run and track a live 10-15 company/day outreach campaign.

That is a genuinely distinct portfolio entry - it demonstrates full-stack ownership plus applied LLM usage in a non-RAG, non-chatbot context, which stands out next to LexShield and AlignForge rather than overlapping with them.