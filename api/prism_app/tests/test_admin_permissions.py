"""Admin panel permission helpers and view gates."""

from uuid import uuid4

import pytest
from prism_app.admin import AlertView, UserPermissionView
from prism_app.admin_map_export import MapExportScheduleView
from prism_app.auth.admin_request import (
    request_can_manage_dashboards,
    request_can_manage_map_exports,
    request_has_prism_admin_access,
)
from prism_app.auth.permission_codes import (
    ADMIN_ACCESS,
    CONTENT_VIEW,
    DASHBOARD_MANAGE,
    MAP_EXPORTS_MANAGE,
    can_access_admin_panel,
    can_manage_dashboards_in_admin,
    can_manage_map_exports_in_admin,
)
from prism_app.database.alert_model import AlertModel
from prism_app.database.map_export_schedule_model import MapExportSchedule
from prism_app.database.permission_model import Permission, UserPermission
from prism_app.database.user_model import User
from starlette.requests import Request
from starlette_admin._types import RequestAction
from starlette_admin.exceptions import FormValidationError


def _request_with_codes(codes: set[str]) -> Request:
    scope = {"type": "http", "method": "GET", "path": "/admin/", "headers": []}
    request = Request(scope)
    request.state.permission_codes = codes
    return request


def test_can_access_admin_panel() -> None:
    assert can_access_admin_panel({ADMIN_ACCESS})
    assert can_access_admin_panel({DASHBOARD_MANAGE})
    assert can_access_admin_panel({MAP_EXPORTS_MANAGE})
    assert not can_access_admin_panel({CONTENT_VIEW})
    assert not can_access_admin_panel(set())


def test_can_manage_dashboards_in_admin() -> None:
    assert can_manage_dashboards_in_admin({DASHBOARD_MANAGE})
    assert can_manage_dashboards_in_admin({ADMIN_ACCESS})
    assert not can_manage_dashboards_in_admin({MAP_EXPORTS_MANAGE})
    assert not can_manage_dashboards_in_admin({CONTENT_VIEW})


def test_can_manage_map_exports_in_admin() -> None:
    assert can_manage_map_exports_in_admin({MAP_EXPORTS_MANAGE})
    assert can_manage_map_exports_in_admin({ADMIN_ACCESS})
    assert not can_manage_map_exports_in_admin({DASHBOARD_MANAGE})
    assert not can_manage_map_exports_in_admin({CONTENT_VIEW})


def test_request_has_prism_admin_access() -> None:
    assert request_has_prism_admin_access(_request_with_codes({ADMIN_ACCESS}))
    assert not request_has_prism_admin_access(_request_with_codes({DASHBOARD_MANAGE}))


def test_request_can_manage_dashboards() -> None:
    assert request_can_manage_dashboards(_request_with_codes({DASHBOARD_MANAGE}))
    assert request_can_manage_dashboards(_request_with_codes({ADMIN_ACCESS}))
    assert not request_can_manage_dashboards(_request_with_codes({MAP_EXPORTS_MANAGE}))
    assert not request_can_manage_dashboards(_request_with_codes({CONTENT_VIEW}))


def test_request_can_manage_map_exports() -> None:
    assert request_can_manage_map_exports(_request_with_codes({MAP_EXPORTS_MANAGE}))
    assert request_can_manage_map_exports(_request_with_codes({ADMIN_ACCESS}))
    assert not request_can_manage_map_exports(_request_with_codes({DASHBOARD_MANAGE}))
    assert not request_can_manage_map_exports(_request_with_codes({CONTENT_VIEW}))


def test_map_export_manager_sees_only_schedule_view_in_admin() -> None:
    request = _request_with_codes({MAP_EXPORTS_MANAGE})
    schedule_view = MapExportScheduleView(MapExportSchedule)
    alert_view = AlertView(AlertModel)

    assert schedule_view.is_accessible(request) is True
    assert alert_view.is_accessible(request) is False


def _admin_create_request() -> Request:
    scope = {
        "type": "http",
        "method": "POST",
        "path": "/admin/user-permission/create",
        "headers": [],
    }
    request = Request(scope)
    request.state.action = RequestAction.CREATE
    return request


def test_user_permission_relationship_assign_does_not_sync_fk_columns() -> None:
    """Starlette-admin sets relationships; SQLModel leaves FK columns unset without help."""
    user = User(id=uuid4(), ciam_sub="ciam-sub")
    permission = Permission(id=uuid4(), code="prism.admin.access", label="Admin")
    link = UserPermission()
    link.user = user
    link.permission = permission
    assert link.user_id is None
    assert link.permission_id is None


@pytest.mark.asyncio
async def test_user_permission_populate_obj_sets_foreign_keys() -> None:
    view = UserPermissionView(UserPermission)
    request = _admin_create_request()
    user = User(id=uuid4(), ciam_sub="ciam-sub")
    permission = Permission(id=uuid4(), code="prism.admin.access", label="Admin")
    data = {"user": user, "permission": permission, "granted_at": None}

    obj = await view._populate_obj(request, UserPermission(), data)

    assert obj.user_id == user.id
    assert obj.permission_id == permission.id


@pytest.mark.asyncio
async def test_user_permission_validate_requires_user_and_permission() -> None:
    view = UserPermissionView(UserPermission)
    request = _admin_create_request()

    with pytest.raises(FormValidationError) as exc_info:
        await view.validate(request, {"user": None, "permission": None})

    assert exc_info.value.errors == {
        "user": "Select a user.",
        "permission": "Select a permission.",
    }
