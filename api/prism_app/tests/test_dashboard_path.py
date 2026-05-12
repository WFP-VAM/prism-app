"""Unit tests for dashboard path helper."""

from prism_app.dashboard.util import build_dashboard_path, slugify_dashboard_path_part
from prism_app.database.dashboard_model import (
    DashboardModel,
    DashboardStatus,
    apply_dashboard_path,
)


def test_slugify_path_part_basic() -> None:
    assert slugify_dashboard_path_part("Rainfall anomaly") == "rainfall-anomaly"


def test_slugify_path_part_strips_and_collapses() -> None:
    assert slugify_dashboard_path_part("  SPI -- 2024  ") == "spi-2024"


def test_build_dashboard_path_prefixes_deployment() -> None:
    assert (
        build_dashboard_path("Rainfall anomaly", "mozambique")
        == "mozambique-rainfall-anomaly"
    )


def test_apply_dashboard_path_after_admin_field_order() -> None:
    dashboard = DashboardModel(
        title="Rainfall anomaly",
        deployment="mozambique",
        status=DashboardStatus.draft,
        config={},
        path="pending",
    )

    apply_dashboard_path(dashboard)

    assert dashboard.path == "mozambique-rainfall-anomaly"
