"""Tests for AA drought (country, status) uniqueness guard."""

import uuid

from prism_app.aa_drought.aa_drought_admin import _duplicate_country_status
from prism_app.database.aa_drought_model import AaDroughtCountry, AaDroughtStatus


def test_duplicate_country_status_detects_existing_row() -> None:
    session = _FakeSession()
    existing_id = uuid.uuid4()
    session.scalar_result = existing_id
    assert _duplicate_country_status(
        session,
        AaDroughtCountry.malawi,
        AaDroughtStatus.staging,
    )
    session.scalar_result = None
    assert not _duplicate_country_status(
        session,
        AaDroughtCountry.malawi,
        AaDroughtStatus.staging,
        exclude_id=existing_id,
    )


def test_archived_status_skips_duplicate_check() -> None:
    session = _FakeSession()
    assert not _duplicate_country_status(
        session,
        AaDroughtCountry.zambia,
        AaDroughtStatus.archived,
    )
    assert session.scalar_calls == 0


class _FakeSession:
    def __init__(self) -> None:
        self.scalar_result = None
        self.scalar_calls = 0

    def scalar(self, _stmt: object) -> object | None:
        self.scalar_calls += 1
        return self.scalar_result
