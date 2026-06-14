"""Tests for AA drought published-dataset read helpers."""

from prism_app.aa_drought.published_datasets import served_statuses
from prism_app.database.aa_drought_model import AaDroughtStatus


def test_served_statuses_published_only_by_default() -> None:
    assert served_statuses(include_staging=False) == [AaDroughtStatus.published]


def test_served_statuses_includes_staging_when_requested() -> None:
    statuses = served_statuses(include_staging=True)
    assert AaDroughtStatus.published in statuses
    assert AaDroughtStatus.staging in statuses
    assert AaDroughtStatus.draft not in statuses
    assert AaDroughtStatus.archived not in statuses
