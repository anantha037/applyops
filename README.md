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

For Phase 1, set `GOOGLE_SHEET_ID` to the ID in the spreadsheet URL and set `GOOGLE_SERVICE_ACCOUNT_JSON` to either an absolute path to the downloaded service-account JSON key or the complete JSON object on one line. Share the target spreadsheet with the service account's `client_email` as an Editor.

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

Example application creation:

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/applications -ContentType 'application/json' -Body '{"company":"Acme","job_title":"Backend Engineer","application_method":"LinkedIn"}'
```

### Scheduled reminders

ApplyOps checks for applications due today and sends a Telegram reminder at 3:00 PM India time. It also runs the ghosted-application check daily at 9:00 AM India time.

To verify Telegram delivery immediately, ensure at least one application has `Next Action Due` set to today, start the API, then run:

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/internal/reminder-check
```

The response reports `sent: true` and the due count when Telegram accepted a message. A `sent: false` response means no applications are due today.

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
