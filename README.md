# ApplyOps

ApplyOps is a personal job-application command center built around an existing Google Sheet, with a FastAPI backend, React dashboard, Telegram reminders, and daily LLM coaching.

## Current status

Phase 1 is implemented locally: the FastAPI API persists applications and activity events in Google Sheets. The live workbook is created when the API starts.

## Setup

### Prerequisites

- Python 3.x
- Node.js and npm
- A Google service-account JSON key with access to the target sheet
- Telegram and LLM API credentials when those phases are started

### Environment

Copy `.env.example` to `.env` and replace each placeholder with the appropriate local value. Keep `.env`, service-account JSON keys, and API tokens out of version control.

### Required Production Configuration

The following environment variables are mandatory for the application to run correctly in production (e.g., Render):

- `DATABASE_URL`: Must use the Neon pooled (`-pooler`) connection string.
- `R2_ACCOUNT_ID`: Cloudflare account ID.
- `R2_ACCESS_KEY_ID`: Cloudflare R2 access key.
- `R2_SECRET_ACCESS_KEY`: Cloudflare R2 secret key.
- `R2_BUCKET_NAME`: Name of the private R2 bucket (e.g., `applyops-resumes`).

### Historical / Migration Tooling (Optional)

Google Sheets is **no longer required** for runtime operations. The `migrate_sheets_to_postgres.py` script and legacy `sheets_client` are retained only as fallback historical tools. If you need to re-run the migration, install `requirements-migration.txt` and provide `GOOGLE_SHEET_ID` and `GOOGLE_SERVICE_ACCOUNT_JSON` locally.

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Start the API from the repository root:

```powershell
python -m uvicorn backend.main:app --reload
```

On startup, ApplyOps creates the `Applications`, `Activity Log`, and `Settings` tabs and their headers if they do not already exist.

### Phase 1 API

- `GET /applications?status=In%20Progress&stage=Called`
- `POST /applications`
- `PATCH /applications/{id}`
- `DELETE /applications/{id}`
- `POST /activity`
- `GET /activity?date=today` (or `YYYY-MM-DD`)
- `GET /dashboard/due-today`
- `POST /internal/reminder-check`
- `POST /internal/daily-feedback`

Example application creation:

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/applications -ContentType 'application/json' -Body '{"company":"Acme","job_title":"Backend Engineer","application_method":"LinkedIn"}'
```

### Scheduled reminders

ApplyOps checks for applications due today and sends a Telegram reminder at 3:00 PM India time. It runs the ghosted-application check daily at 9:00 AM, and sends one Groq-generated daily coaching message at 9:00 PM, all in India time.

To verify Telegram delivery immediately, ensure at least one application has `Next Action Due` set to today, start the API, then run:

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/internal/reminder-check
```

The response reports `sent: true` and the due count when Telegram accepted a message. A `sent: false` response means no applications are due today.

### Daily coaching verification

Set a whole-number goal in the first data row under `Daily Goal` on the `Settings` tab. To test the real Groq and Telegram path immediately, submit a synthetic daily summary:

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/internal/daily-feedback -ContentType 'application/json' -Body '{"date":"2026-08-05","goal":12,"applications_logged_today":7,"calls_made_today":3,"responses_today":1,"streak_days":4,"remarks_today":["Technical interview completed"]}'
```

The response contains the generated message, and the same message arrives in Telegram. The service performs one Groq call and limits the message to 40 words.

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

The React dashboard will be added during Phase 4.

## Build phases

1. Backend and Google Sheets sync
2. Scheduler and Telegram reminders
3. LLM feedback engine
4. Frontend dashboard
5. Deployment

Each phase is verified before moving to the next one.
