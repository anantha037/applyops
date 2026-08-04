# ApplyOps

ApplyOps is a personal job-application command center built around an existing Google Sheet, with a FastAPI backend, React dashboard, Telegram reminders, and daily LLM coaching.

## Current status

The repository skeleton is in place. Feature implementation begins with Phase 1 after the structure is confirmed.

## Setup

### Prerequisites

- Python 3.x
- Node.js and npm
- A Google service-account JSON key with access to the target sheet
- Telegram and LLM API credentials when those phases are started

### Environment

Copy `.env.example` to `.env` and replace each placeholder with the appropriate local value. Keep `.env`, service-account JSON keys, and API tokens out of version control.

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

The FastAPI application and endpoints will be added during Phase 1.

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
