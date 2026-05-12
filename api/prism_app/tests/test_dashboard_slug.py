"""Unit tests for dashboard URL slug helper."""

from prism_app.dashboard.util import build_dashboard_slug, slugify_dashboard_name
from prism_app.database.dashboard_model import (
    DashboardModel,
    DashboardStatus,
    apply_dashboard_slug,
)


def test_slugify_basic() -> None:
    assert slugify_dashboard_name("Rainfall anomaly") == "rainfall-anomaly"


def test_slugify_strips_and_collapses() -> None:
    assert slugify_dashboard_name("  SPI -- 2024  ") == "spi-2024"


def test_build_dashboard_slug_prefixes_deployment() -> None:
    assert (
        build_dashboard_slug("Rainfall anomaly", "mozambique")
        == "mozambique-rainfall-anomaly"
    )


def test_apply_dashboard_slug_after_admin_field_order() -> None:
    dashboard = DashboardModel(
        title="Rainfall anomaly",
        deployment="mozambique",
        status=DashboardStatus.draft,
        config={},
        slug="pending",
    )

    apply_dashboard_slug(dashboard)

    assert dashboard.slug == "mozambique-rainfall-anomaly"
