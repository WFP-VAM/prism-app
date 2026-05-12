"""UTC cron parsing and next-run computation for map export schedules."""

from __future__ import annotations

from datetime import datetime

from croniter import croniter
from prism_app.utils import utc_now


def validate_cron_expression(cron_expression: str) -> str:
    """Return the stripped expression or raise ``ValueError`` if invalid."""
    expression = cron_expression.strip()
    if not expression:
        raise ValueError("Cron expression is required.")
    try:
        croniter(expression, utc_now())
    except (KeyError, ValueError) as exc:
        raise ValueError(f"Invalid cron expression: {expression!r}") from exc
    return expression


def compute_next_run_at(
    cron_expression: str,
    *,
    base_time: datetime | None = None,
) -> datetime:
    """Next fire time in UTC for a standard 5-field cron expression."""
    expression = validate_cron_expression(cron_expression)
    base = base_time or utc_now()
    return croniter(expression, base).get_next(datetime)
