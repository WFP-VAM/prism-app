"""Tests for AA drought (country, status) uniqueness guard."""

import uuid
from unittest.mock import MagicMock, patch

from prism_app.aa_drought.aa_drought_admin import _duplicate_country_status
from prism_app.database.aa_drought_model import AaDroughtCountry, AaDroughtStatus


def test_duplicate_country_status_detects_existing_row() -> None:
    engine = MagicMock()
    existing_id = uuid.uuid4()
    session = MagicMock()
    session.scalar.return_value = existing_id
    session_context = MagicMock()
    session_context.__enter__.return_value = session
    session_context.__exit__.return_value = None

    with patch(
        "prism_app.aa_drought.aa_drought_admin.sessionmaker",
        return_value=lambda **_: session_context,
    ):
        assert _duplicate_country_status(
            engine,
            AaDroughtCountry.malawi,
            AaDroughtStatus.staging,
        )
        session.scalar.return_value = None
        assert not _duplicate_country_status(
            engine,
            AaDroughtCountry.malawi,
            AaDroughtStatus.staging,
            exclude_id=existing_id,
        )


def test_archived_status_skips_duplicate_check() -> None:
    engine = MagicMock()
    assert not _duplicate_country_status(
        engine,
        AaDroughtCountry.zambia,
        AaDroughtStatus.archived,
    )
    engine.assert_not_called()
