"""Admin panel permission helpers and view gates."""

from prism_app.auth.admin_request import (
    request_can_manage_dashboards,
    request_has_prism_admin_access,
)
from prism_app.auth.permission_codes import (
    ADMIN_ACCESS,
    CONTENT_VIEW,
    DASHBOARD_MANAGE,
    can_access_admin_panel,
    can_manage_dashboards_in_admin,
)
from starlette.requests import Request


def _request_with_codes(codes: set[str]) -> Request:
    scope = {"type": "http", "method": "GET", "path": "/admin/", "headers": []}
    request = Request(scope)
    request.state.permission_codes = codes
    return request


def test_can_access_admin_panel() -> None:
    assert can_access_admin_panel({ADMIN_ACCESS})
    assert can_access_admin_panel({DASHBOARD_MANAGE})
    assert not can_access_admin_panel({CONTENT_VIEW})
    assert not can_access_admin_panel(set())


def test_can_manage_dashboards_in_admin() -> None:
    assert can_manage_dashboards_in_admin({DASHBOARD_MANAGE})
    assert can_manage_dashboards_in_admin({ADMIN_ACCESS})
    assert not can_manage_dashboards_in_admin({CONTENT_VIEW})


def test_request_has_prism_admin_access() -> None:
    assert request_has_prism_admin_access(_request_with_codes({ADMIN_ACCESS}))
    assert not request_has_prism_admin_access(_request_with_codes({DASHBOARD_MANAGE}))


def test_request_can_manage_dashboards() -> None:
    assert request_can_manage_dashboards(_request_with_codes({DASHBOARD_MANAGE}))
    assert request_can_manage_dashboards(_request_with_codes({ADMIN_ACCESS}))
    assert not request_can_manage_dashboards(_request_with_codes({CONTENT_VIEW}))
