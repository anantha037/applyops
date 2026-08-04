"""Google Sheets persistence for ApplyOps."""

from __future__ import annotations

import json
import os
from datetime import date, datetime
from pathlib import Path
from typing import Any

import gspread
from dotenv import load_dotenv
from google.oauth2.service_account import Credentials

from backend.models import Activity, ActivityCreate, Application, ApplicationCreate, ApplicationUpdate, utc_now

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

APPLICATIONS_HEADERS = [
    "ID", "Date Applied", "Company", "Job Title", "JD Summary", "Application Method",
    "HR Name", "HR Phone", "HR Email", "CTC", "Status", "Stage", "Last Touch Date",
    "Next Action Due", "Interview Date", "Interview Round", "Interview Attended",
    "Latest Update", "Remarks",
]
ACTIVITY_LOG_HEADERS = ["ID", "Timestamp", "Application ID", "Company", "Action Type", "Notes"]
SETTINGS_HEADERS = [
    "Daily Goal", "Working Hours Start", "Working Hours End", "Telegram Chat ID", "Dashboard PIN"
]

WORKSHEET_HEADERS = {
    "Applications": APPLICATIONS_HEADERS,
    "Activity Log": ACTIVITY_LOG_HEADERS,
    "Settings": SETTINGS_HEADERS,
}
SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]


class SheetConfigurationError(RuntimeError):
    """Raised when the local credentials required for Sheets are missing or invalid."""


def _serialize(value: Any) -> str | int | float | bool:
    if value is None:
        return ""
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return value


def _as_optional_bool(value: str) -> bool | None:
    if not value:
        return None
    return value.strip().lower() in {"true", "1", "yes"}


class SheetsClient:
    """Read and write the ApplyOps workbook using the configured service account."""

    def __init__(self) -> None:
        self._spreadsheet_id = os.getenv("GOOGLE_SHEET_ID", "").strip()
        credentials_value = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "").strip()
        if not self._spreadsheet_id:
            raise SheetConfigurationError("GOOGLE_SHEET_ID is not configured in .env")
        if not credentials_value:
            raise SheetConfigurationError("GOOGLE_SERVICE_ACCOUNT_JSON is not configured in .env")

        credentials = self._load_credentials(credentials_value)
        self._spreadsheet = gspread.authorize(credentials).open_by_key(self._spreadsheet_id)

    @staticmethod
    def _load_credentials(credentials_value: str) -> Credentials:
        """Support either an absolute key-file path or a JSON object in the environment."""
        key_path = Path(credentials_value)
        if key_path.is_file():
            return Credentials.from_service_account_file(key_path, scopes=SCOPES)
        try:
            service_account_info = json.loads(credentials_value)
        except json.JSONDecodeError as exc:
            raise SheetConfigurationError(
                "GOOGLE_SERVICE_ACCOUNT_JSON must be a service-account JSON string or a valid file path"
            ) from exc
        return Credentials.from_service_account_info(service_account_info, scopes=SCOPES)

    def ensure_structure(self) -> None:
        """Create required tabs and write headers only when a tab is empty."""
        existing_titles = {worksheet.title for worksheet in self._spreadsheet.worksheets()}
        for title, headers in WORKSHEET_HEADERS.items():
            worksheet = (
                self._spreadsheet.worksheet(title)
                if title in existing_titles
                else self._spreadsheet.add_worksheet(title=title, rows=1000, cols=len(headers))
            )
            if not worksheet.row_values(1):
                worksheet.append_row(headers, value_input_option="RAW")
            elif worksheet.row_values(1) != headers:
                raise SheetConfigurationError(
                    f"Worksheet '{title}' has unexpected headers. Expected: {headers}"
                )

    def list_applications(
        self, status: str | None = None, stage: str | None = None
    ) -> list[Application]:
        applications = [self._application_from_row(row) for row in self._applications().get_all_records()]
        return [
            application
            for application in applications
            if (status is None or application.status == status)
            and (stage is None or application.stage == stage)
        ]

    def create_application(self, application: Application) -> Application:
        self._applications().append_row(self._application_row(application), value_input_option="RAW")
        return application

    def applications_due_on(self, target_date: date) -> list[Application]:
        """Return applications whose next scheduled action is due on target_date."""
        return [
            application
            for application in self.list_applications()
            if application.next_action_due == target_date
        ]

    def get_application(self, application_id: str) -> Application | None:
        row_number = self._application_row_number(application_id)
        if row_number is None:
            return None
        row = dict(zip(APPLICATIONS_HEADERS, self._applications().row_values(row_number), strict=False))
        return self._application_from_row(row)

    def update_application(self, application: Application) -> Application | None:
        row_number = self._application_row_number(application.id)
        if row_number is None:
            return None
        last_column = gspread.utils.rowcol_to_a1(row_number, len(APPLICATIONS_HEADERS))
        self._applications().update(
            f"A{row_number}:{last_column}", [self._application_row(application)], value_input_option="RAW"
        )
        return application

    def delete_application(self, application_id: str) -> bool:
        row_number = self._application_row_number(application_id)
        if row_number is None:
            return False
        self._applications().delete_rows(row_number)
        return True

    def create_activity(self, activity_id: str, payload: ActivityCreate) -> Activity:
        activity = Activity(
            id=activity_id,
            timestamp=utc_now(),
            application_id=payload.application_id,
            company=payload.company,
            action_type=payload.action_type,
            notes=payload.notes,
        )
        self._activity_log().append_row(
            [_serialize(value) for value in activity.model_dump().values()], value_input_option="RAW"
        )
        return activity

    def list_activity(self, activity_date: date) -> list[Activity]:
        activities: list[Activity] = []
        for row in self._activity_log().get_all_records():
            timestamp = datetime.fromisoformat(row["Timestamp"].replace("Z", "+00:00"))
            if timestamp.date() == activity_date:
                activities.append(
                    Activity(
                        id=row["ID"], timestamp=timestamp, application_id=row["Application ID"],
                        company=row["Company"], action_type=row["Action Type"], notes=row["Notes"],
                    )
                )
        return activities

    def _applications(self) -> gspread.Worksheet:
        return self._spreadsheet.worksheet("Applications")

    def _activity_log(self) -> gspread.Worksheet:
        return self._spreadsheet.worksheet("Activity Log")

    def _application_row_number(self, application_id: str) -> int | None:
        values = self._applications().col_values(1)
        try:
            return values.index(application_id) + 1
        except ValueError:
            return None

    @staticmethod
    def _application_row(application: Application) -> list[str | int | float | bool]:
        values = application.model_dump()
        return [_serialize(values[field]) for field in (
            "id", "date_applied", "company", "job_title", "jd_summary", "application_method",
            "hr_name", "hr_phone", "hr_email", "ctc", "status", "stage", "last_touch_date",
            "next_action_due", "interview_date", "interview_round", "interview_attended",
            "latest_update", "remarks",
        )]

    @staticmethod
    def _application_from_row(row: dict[str, Any]) -> Application:
        return Application(
            id=row["ID"], date_applied=row["Date Applied"], company=row["Company"],
            job_title=row["Job Title"], jd_summary=row["JD Summary"],
            application_method=row["Application Method"], hr_name=row["HR Name"],
            hr_phone=row["HR Phone"], hr_email=row["HR Email"], ctc=row["CTC"],
            status=row["Status"], stage=row["Stage"], last_touch_date=row["Last Touch Date"] or None,
            next_action_due=row["Next Action Due"] or None,
            interview_date=row["Interview Date"] or None, interview_round=row["Interview Round"],
            interview_attended=_as_optional_bool(row["Interview Attended"]),
            latest_update=row["Latest Update"], remarks=row["Remarks"],
        )
