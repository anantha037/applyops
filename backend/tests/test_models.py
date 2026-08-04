from datetime import date

import pytest

from backend.models import ApplicationStage, calculate_next_action_due


@pytest.mark.parametrize(
    ("stage", "last_touch_date", "expected"),
    [
        (ApplicationStage.APPLIED, date(2026, 8, 5), date(2026, 8, 7)),
        (ApplicationStage.CALLED, date(2026, 8, 5), date(2026, 8, 8)),
        (ApplicationStage.FOLLOW_UP_1, date(2026, 8, 5), date(2026, 8, 10)),
        (ApplicationStage.FOLLOW_UP_2, date(2026, 8, 5), date(2026, 8, 10)),
        (ApplicationStage.FOLLOW_UP_3, date(2026, 8, 5), None),
        (ApplicationStage.CLOSED, date(2026, 8, 5), None),
        (ApplicationStage.EMAILED, date(2026, 8, 5), None),
        (ApplicationStage.APPLIED, None, None),
    ],
)
def test_calculate_next_action_due(
    stage: ApplicationStage, last_touch_date: date | None, expected: date | None
) -> None:
    assert calculate_next_action_due(stage, last_touch_date) == expected
