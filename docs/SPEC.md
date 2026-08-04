# Project: "ApplyOps" - Full Build Spec

Full-stack job application command center. Replaces manual spreadsheet tracking with a live dashboard, automated follow-up scheduling, phone-based reminders, and LLM-generated daily coaching, kept in sync with an existing Google Sheet.

---

## 0. Build tooling

Built using Codex CLI — GPT-5.6 Terra as the default model, Luna for mechanical/boilerplate work. See AGENTS.md for the model + reasoning-effort assignment per phase.

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

Phase 5 - Deploy (Day 3): Docker + GCP Cloud Run + GitHub Actions CI/CD, matching your existing LexShield/NexusMCP deployment pattern exactly.

Phase 6 - Use it daily starting immediately after Phase 1-2. You do not need to wait for the full dashboard to start getting value; the backend plus Telegram reminders alone are usable mid-build.

---

## 8. Resume framing (once shipped)

A suggested framing once complete: built and deployed a full-stack job-search operations tool - FastAPI + React, with two-way Google Sheets sync, an automated follow-up scheduler, Telegram-based reminders, and an LLM-generated daily performance coaching layer (Groq) - used to run and track a live 10-15 company/day outreach campaign.

That is a genuinely distinct portfolio entry - it demonstrates full-stack ownership plus applied LLM usage in a non-RAG, non-chatbot context, which stands out next to LexShield and AlignForge rather than overlapping with them.
