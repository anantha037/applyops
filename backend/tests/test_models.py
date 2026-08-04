from datetime import date

import pytest

from backend.models import ApplicationStage, ApplicationStatus, calculate_next_action_due


@pytest.mark.parametrize(
    ("stage", "last_touch_date", "application_status", "expected"),
    [
        (ApplicationStage.APPLIED, date(2026, 8, 5), None, date(2026, 8, 7)),
        (ApplicationStage.CALLED, date(2026, 8, 5), None, date(2026, 8, 8)),
        (ApplicationStage.FOLLOW_UP_1, date(2026, 8, 5), None, date(2026, 8, 10)),
        (ApplicationStage.FOLLOW_UP_2, date(2026, 8, 5), None, date(2026, 8, 10)),
        (ApplicationStage.FOLLOW_UP_3, date(2026, 8, 5), None, None),
        (ApplicationStage.CLOSED, date(2026, 8, 5), None, None),
        (ApplicationStage.EMAILED, date(2026, 8, 5), None, None),
        (ApplicationStage.APPLIED, None, None, None),
        (ApplicationStage.APPLIED, date(2026, 8, 5), ApplicationStatus.OFFER_RECEIVED, None),
        (ApplicationStage.CALLED, date(2026, 8, 5), ApplicationStatus.REJECTED, None),
    ],
)
def test_calculate_next_action_due(
    stage: ApplicationStage,
    last_touch_date: date | None,
    application_status: ApplicationStatus | None,
    expected: date | None,
) -> None:
    assert calculate_next_action_due(stage, last_touch_date, application_status) == expected
