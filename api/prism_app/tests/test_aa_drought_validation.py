"""Tests for AA drought CSV validation contract."""

from prism_app.aa_drought.validation import validate_aa_drought_csv

_HEADER = (
    "district,index,category,window,issue_ready,issue_set,trigger_ready,"
    "trigger_set,vulnerability,prob_ready,prob_set,season,date_ready,date_set"
)

# A valid row matching the real frontend export shape.
_GOOD_ROW = "Gwembe,SPI DJF,Moderate,Window 1,8,9,0.3,0.35,GT,0.3,0.55,2024-25,2024-08-01,2024-09-01"

# Malawi-style export with a leading unnamed index column.
_MALAWI_HEADER = "," + _HEADER
_MALAWI_ROW = "0,Machinga,SPI NDJ,Normal,Window 1,7,8,0.2,0.25,NRT,0.2,0.36,2024-25,2024-07-01,2024-08-01"


def _csv(*rows: str, header: str = _HEADER) -> str:
    return "\n".join([header, *rows]) + "\n"


def test_valid_csv_passes() -> None:
    result = validate_aa_drought_csv(_csv(_GOOD_ROW))
    assert result.ok
    assert result.row_count == 1
    assert result.districts == ["Gwembe"]
    assert result.seasons == ["2024-25"]
    assert result.date_min == "2024-08-01"


def test_leading_index_column_tolerated() -> None:
    """Malawi exports carry an unnamed leading column; it must not break validation."""
    result = validate_aa_drought_csv(_csv(_MALAWI_ROW, header=_MALAWI_HEADER))
    assert result.ok
    assert result.districts == ["Machinga"]


def test_empty_file_rejected() -> None:
    result = validate_aa_drought_csv("")
    assert not result.ok
    assert any("empty" in e.lower() for e in result.errors)


def test_missing_required_columns_rejected() -> None:
    result = validate_aa_drought_csv("district,index\nA,B\n")
    assert not result.ok
    assert any("Missing required columns" in e for e in result.errors)


def test_only_blank_prob_ready_rows_rejected() -> None:
    blank = "Gwembe,SPI DJF,Moderate,Window 1,8,9,0.3,0.35,GT,,0.55,2024-25,2024-08-01,2024-09-01"
    result = validate_aa_drought_csv(_csv(blank))
    assert not result.ok
    assert any("No data rows" in e for e in result.errors)


def test_probability_out_of_range_rejected() -> None:
    bad = "Gwembe,SPI DJF,Moderate,Window 1,8,9,0.3,0.35,GT,1.5,0.55,2024-25,2024-08-01,2024-09-01"
    result = validate_aa_drought_csv(_csv(bad))
    assert not result.ok
    assert any("outside [0, 1]" in e for e in result.errors)


def test_invalid_category_and_window_rejected() -> None:
    bad = "Gwembe,SPI DJF,Nope,Window 9,8,9,0.3,0.35,GT,0.3,0.55,2024-25,2024-08-01,2024-09-01"
    result = validate_aa_drought_csv(_csv(bad))
    assert not result.ok
    assert any("invalid category" in e for e in result.errors)
    assert any("invalid window" in e for e in result.errors)


def test_non_iso_date_rejected() -> None:
    bad = "Gwembe,SPI DJF,Moderate,Window 1,8,9,0.3,0.35,GT,0.3,0.55,2024-25,2024/08/01,2024-09-01"
    result = validate_aa_drought_csv(_csv(bad))
    assert not result.ok
    assert any("ISO YYYY-MM-DD" in e for e in result.errors)


def test_bad_season_format_rejected() -> None:
    bad = "Gwembe,SPI DJF,Moderate,Window 1,8,9,0.3,0.35,GT,0.3,0.55,2024,2024-08-01,2024-09-01"
    result = validate_aa_drought_csv(_csv(bad))
    assert not result.ok
    assert any("YYYY-YY" in e for e in result.errors)


def test_duplicate_grain_rows_allowed() -> None:
    """Real exports (e.g. Zambia) legitimately repeat (district, window, date) rows."""
    result = validate_aa_drought_csv(_csv(_GOOD_ROW, _GOOD_ROW))
    assert result.ok
    assert result.row_count == 2


def test_row_count_drop_warns_against_prior() -> None:
    result = validate_aa_drought_csv(_csv(_GOOD_ROW), prior_row_count=10)
    assert result.ok
    assert any("full-replace" in w for w in result.warnings)
