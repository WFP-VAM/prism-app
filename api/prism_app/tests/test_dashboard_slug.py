"""Unit tests for dashboard URL slug helper."""

from prism_app.dashboard.util import slugify_dashboard_name


def test_slugify_basic() -> None:
    assert slugify_dashboard_name("Rainfall anomaly") == "rainfall-anomaly"


def test_slugify_strips_and_collapses() -> None:
    assert slugify_dashboard_name("  SPI -- 2024  ") == "spi-2024"
