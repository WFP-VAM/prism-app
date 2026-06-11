"""Server-side validation for Anticipatory Action drought CSV uploads.

The contract mirrors what the frontend parser actually consumes
(``frontend/src/context/anticipatoryAction/AADroughtStateSlice/utils.ts``),
NOT the stale ``AACSVKeys`` list. Rows whose ``prob_ready`` is empty are
ignored, exactly as the frontend's ``parseAndTransformAA`` drops them.
"""

from __future__ import annotations

import csv
import io
import re
from dataclasses import dataclass, field

# Columns the frontend reads off each row. ``index`` may also appear as a
# leading unnamed column in some exports (Malawi); that is tolerated.
REQUIRED_COLUMNS = (
    "district",
    "index",
    "category",
    "window",
    "season",
    "prob_ready",
    "prob_set",
    "trigger_ready",
    "trigger_set",
    "date_ready",
    "date_set",
    "vulnerability",
)

VALID_CATEGORIES = frozenset({"Normal", "Mild", "Moderate", "Severe"})
VALID_WINDOWS = frozenset({"Window 1", "Window 2"})

_PROB_FIELDS = ("prob_ready", "prob_set", "trigger_ready", "trigger_set")
_DATE_FIELDS = ("date_ready", "date_set")
_SEASON_RE = re.compile(r"^\d{4}-\d{2}$")
_ISO_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

# Cap the number of per-row error messages so a broken file does not produce a
# wall of text in the admin form.
_MAX_ROW_ERRORS = 25


@dataclass
class AaDroughtValidationResult:
    """Outcome of validating one uploaded CSV (errors block save; warnings don't)."""

    row_count: int = 0
    districts: list[str] = field(default_factory=list)
    seasons: list[str] = field(default_factory=list)
    date_min: str | None = None
    date_max: str | None = None
    trigger_breaches: int = 0
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.errors


def _is_blank(value: str | None) -> bool:
    return value is None or value.strip() == ""


def _parse_unit_interval(value: str) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def validate_aa_drought_csv(
    csv_text: str, *, prior_row_count: int | None = None
) -> AaDroughtValidationResult:
    """Validate raw CSV text against the AA drought contract.

    ``prior_row_count`` is the data-row count of the currently published dataset
    for this country, if any. Because uploads are full-replace (cumulative), a
    drop in row count is surfaced as a warning so reviewers notice lost history.
    """
    result = AaDroughtValidationResult()

    if _is_blank(csv_text):
        result.errors.append("The uploaded file is empty.")
        return result

    reader = csv.DictReader(io.StringIO(csv_text))
    if reader.fieldnames is None:
        result.errors.append("The file has no header row.")
        return result

    headers = {(h or "").strip() for h in reader.fieldnames}
    missing = [c for c in REQUIRED_COLUMNS if c not in headers]
    if missing:
        result.errors.append(f"Missing required columns: {', '.join(missing)}.")
        return result

    districts: set[str] = set()
    seasons: set[str] = set()
    dates: list[str] = []
    row_errors: list[str] = []
    data_rows = 0

    for line_no, row in enumerate(reader, start=2):  # header is line 1
        # Match the frontend: rows with an empty ``prob_ready`` are dropped.
        if _is_blank(row.get("prob_ready")):
            continue
        data_rows += 1

        if len(row_errors) >= _MAX_ROW_ERRORS:
            continue

        category = (row.get("category") or "").strip()
        if category and category not in VALID_CATEGORIES:
            row_errors.append(f"Row {line_no}: invalid category '{category}'.")

        window = (row.get("window") or "").strip()
        if window and window not in VALID_WINDOWS:
            row_errors.append(f"Row {line_no}: invalid window '{window}'.")

        season = (row.get("season") or "").strip()
        if not season:
            row_errors.append(f"Row {line_no}: missing season.")
        elif not _SEASON_RE.match(season):
            row_errors.append(
                f"Row {line_no}: season '{season}' must match YYYY-YY (e.g. 2024-25)."
            )
        else:
            seasons.add(season)

        for prob_field in _PROB_FIELDS:
            raw = row.get(prob_field)
            if _is_blank(raw):
                continue
            value = _parse_unit_interval(raw.strip())
            if value is None:
                row_errors.append(
                    f"Row {line_no}: {prob_field} '{raw}' is not a number."
                )
            elif not 0.0 <= value <= 1.0:
                row_errors.append(
                    f"Row {line_no}: {prob_field} '{raw}' is outside [0, 1]."
                )

        for date_field in _DATE_FIELDS:
            raw = row.get(date_field)
            if _is_blank(raw):
                continue
            stamp = raw.strip()
            if not _ISO_DATE_RE.match(stamp):
                row_errors.append(
                    f"Row {line_no}: {date_field} '{raw}' must be ISO YYYY-MM-DD."
                )
            elif date_field == "date_ready":
                dates.append(stamp)

        district = (row.get("district") or "").strip()
        if district:
            districts.add(district)

        # Summary only: a "breach" is probability meeting or exceeding trigger.
        prob_ready = _parse_unit_interval((row.get("prob_ready") or "").strip())
        trigger_ready = _parse_unit_interval((row.get("trigger_ready") or "").strip())
        if (
            prob_ready is not None
            and trigger_ready is not None
            and prob_ready >= trigger_ready > 0
        ):
            result.trigger_breaches += 1

    if data_rows == 0:
        result.errors.append("No data rows (every row has an empty prob_ready).")

    result.errors.extend(row_errors)
    result.row_count = data_rows
    result.districts = sorted(districts)
    result.seasons = sorted(seasons)
    if dates:
        result.date_min = min(dates)
        result.date_max = max(dates)

    if prior_row_count is not None and data_rows < prior_row_count and result.ok:
        result.warnings.append(
            f"This upload has {data_rows} data rows but the currently published "
            f"dataset has {prior_row_count}. Uploads are full-replace — confirm "
            "the file includes all historical seasons."
        )

    return result
