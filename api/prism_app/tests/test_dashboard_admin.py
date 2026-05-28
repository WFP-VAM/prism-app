"""Tests for dashboard admin duplicate handling."""

import pytest
from prism_app.dashboard.dashboard_admin import DashboardAdminView
from prism_app.database.dashboard_model import DashboardModel
from sqlalchemy.exc import IntegrityError
from starlette_admin.exceptions import FormValidationError


@pytest.fixture
def admin_view() -> DashboardAdminView:
    return DashboardAdminView(DashboardModel)


def test_handle_exception_maps_country_title_violation_to_config_error(
    admin_view: DashboardAdminView,
) -> None:
    exc = IntegrityError("", {}, None)
    exc.orig = Exception(
        'duplicate key value violates unique constraint "uq_dashboard_country_title"'
    )

    with pytest.raises(FormValidationError) as raised:
        admin_view.handle_exception(exc)

    assert "config" in raised.value.errors
    assert "already exists" in raised.value.errors["config"]
