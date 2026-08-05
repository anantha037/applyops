"""Reports API routes."""

from __future__ import annotations

import csv
import io
from datetime import date
from typing import Literal

from fastapi import APIRouter, Query, Request
from fastapi.responses import StreamingResponse

from backend.sheets_client import SheetsClient

router = APIRouter(prefix="/reports", tags=["reports"])


def _sheets(request: Request) -> SheetsClient:
    return request.app.state.sheets


def _is_in_range(d_str: str | None, start: date | None, end: date | None) -> bool:
    if not d_str:
        return True
    try:
        # Only parse first 10 chars (YYYY-MM-DD) to handle both date and datetime
        d = date.fromisoformat(d_str[:10])
        if start and d < start:
            return False
        if end and d > end:
            return False
        return True
    except ValueError:
        return True


@router.get("/export")
def export_report(
    request: Request,
    type: Literal["applications", "activity", "full"] = Query(..., description="Report type"),
    start: date | None = Query(None, description="Start date (YYYY-MM-DD)"),
    end: date | None = Query(None, description="End date (YYYY-MM-DD)"),
) -> StreamingResponse:
    """Export a CSV report of the requested type, optionally filtered by date range."""
    sheets = _sheets(request)
    
    apps = sheets.list_applications()
    activities = sheets.list_activity()
    
    # Filter by date
    if start or end:
        apps = [a for a in apps if _is_in_range(a.date_applied, start, end)]
        activities = [a for a in activities if _is_in_range(a.timestamp.isoformat() if a.timestamp else None, start, end)]

    output = io.StringIO()
    writer = csv.writer(output)

    if type == "applications":
        # Export applications
        headers = ["ID", "Date Applied", "Company", "Job Title", "JD Summary", "Application Method", 
                   "Status", "Stage", "HR Name", "HR Email", "HR Phone", "Next Action Due", "Interview Date", "Remarks"]
        writer.writerow(headers)
        for a in apps:
            writer.writerow([
                a.id, a.date_applied, a.company, a.job_title, a.jd_summary, a.application_method,
                a.status, a.stage, a.hr_name, a.hr_email, a.hr_phone, a.next_action_due, a.interview_date, a.remarks
            ])
            
    elif type == "activity":
        # Export activities
        headers = ["ID", "Timestamp", "Application ID", "Company", "Action Type", "Notes"]
        writer.writerow(headers)
        for a in activities:
            writer.writerow([
                a.id, a.timestamp.isoformat() if a.timestamp else "", a.application_id, 
                a.company, a.action_type, a.notes
            ])
            
    elif type == "full":
        # Denormalized full export (Application left joined with Activity)
        # 1 row per activity, plus apps with no activity
        headers = [
            "Application ID", "Date Applied", "App Company", "Job Title", "Status", "Stage",
            "Activity ID", "Activity Timestamp", "Action Type", "Activity Notes"
        ]
        writer.writerow(headers)
        
        # Build lookup
        acts_by_app = {}
        for a in activities:
            acts_by_app.setdefault(a.application_id, []).append(a)
            
        for app in apps:
            app_acts = acts_by_app.get(app.id, [])
            if not app_acts:
                writer.writerow([
                    app.id, app.date_applied, app.company, app.job_title, app.status, app.stage,
                    "", "", "", ""
                ])
            else:
                for act in app_acts:
                    writer.writerow([
                        app.id, app.date_applied, app.company, app.job_title, app.status, app.stage,
                        act.id, act.timestamp.isoformat() if act.timestamp else "", act.action_type, act.notes
                    ])

    # Reset string IO to beginning
    output.seek(0)
    
    filename = f"applyops_export_{type}_{date.today().isoformat()}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
