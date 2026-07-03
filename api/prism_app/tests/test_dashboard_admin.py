"""Admin dashboard view bulk actions."""

from uuid import uuid4

import pytest
from prism_app.admin import GatedDashboardAdminView
from prism_app.admin_bulk_actions import bulk_status_select_form
from prism_app.auth.permission_codes import ADMIN_ACCESS, DASHBOARD_MANAGE
from prism_app.dashboard.dashboard_admin import DashboardAdminView
from prism_app.database.dashboard_model import (
    DashboardCountry,
    DashboardModel,
    DashboardStatus,
)
from starlette.datastructures import FormData
from starlette.requests import Request
from starlette_admin.exceptions import ActionFailed, FormValidationError


def _request() -> Request:
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/",
        "query_string": b"",
        "headers": [],
    }
    return Request(scope)


def _scoped_dashboard_request(
    *,
    admin_access: bool = False,
    countries: frozenset[str] | None = frozenset({"mozambique"}),
) -> Request:
    request = _request()
    if admin_access:
        request.state.permission_codes = {ADMIN_ACCESS}
        request.state.permission_scopes = {}
    else:
        request.state.permission_codes = {DASHBOARD_MANAGE}
        request.state.permission_scopes = {DASHBOARD_MANAGE: countries}
    return request


def test_dashboard_view_bulk_actions_include_update_status_and_delete() -> None:
    view = DashboardAdminView(DashboardModel)
    assert view.list_template == "dashboard_list.html"
    assert view.actions == ["update_status", "delete"]
    assert "update_status" in view._actions
    assert "delete" in view._actions
    assert view._actions["update_status"]["confirmation"]
    assert view._actions["delete"]["confirmation"]
    assert view._actions["update_status"]["form"] == bulk_status_select_form(
        DashboardStatus
    )


@pytest.mark.asyncio
async def test_update_status_action_requires_status() -> None:
    view = DashboardAdminView(DashboardModel)
    request = _request()
    request._form = FormData([])  # noqa: SLF001

    async def _fake_form() -> FormData:
        return request._form  # noqa: SLF001

    request.form = _fake_form  # type: ignore[method-assign]

    with pytest.raises(ActionFailed, match="Status is required"):
        await view.update_status_action(request, [str(uuid4())])


@pytest.mark.asyncio
async def test_update_status_action_updates_selected_dashboards(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from unittest.mock import AsyncMock, MagicMock

    view = DashboardAdminView(DashboardModel)
    dashboard = DashboardModel(
        id=uuid4(),
        title="Mozambique overview",
        path="mozambique/mozambique-overview",
        status=DashboardStatus.draft,
        country=DashboardCountry.mozambique,
        config={"title": "Mozambique overview", "country": "mozambique"},
    )
    request = _request()
    request._form = FormData([("status", "published")])  # noqa: SLF001

    async def _fake_form() -> FormData:
        return request._form  # noqa: SLF001

    request.form = _fake_form  # type: ignore[method-assign]

    session = MagicMock()
    request.state.session = session
    monkeypatch.setattr(
        view,
        "find_by_pks",
        AsyncMock(return_value=[dashboard]),
    )

    message = await view.update_status_action(request, [str(dashboard.id)])

    assert dashboard.status == DashboardStatus.published
    assert dashboard.updated_at is not None
    session.add.assert_called_once_with(dashboard)
    session.commit.assert_called_once()
    assert "1 dashboard" in message
    assert "published" in message


def test_gated_dashboard_list_query_filters_by_country_scope() -> None:
    view = GatedDashboardAdminView(DashboardModel)
    scoped_request = _scoped_dashboard_request(countries=frozenset({"mozambique"}))
    admin_request = _scoped_dashboard_request(admin_access=True)

    scoped_sql = str(
        view.get_list_query(scoped_request).compile(compile_kwargs={"literal_binds": True})
    ).lower()
    admin_sql = str(
        view.get_list_query(admin_request).compile(compile_kwargs={"literal_binds": True})
    ).lower()

    assert "mozambique" in scoped_sql
    assert "lower" in scoped_sql
    assert "mozambique" not in admin_sql


@pytest.mark.asyncio
async def test_gated_dashboard_validate_rejects_country_outside_scope() -> None:
    view = GatedDashboardAdminView(DashboardModel)
    request = _scoped_dashboard_request(countries=frozenset({"mozambique"}))
    data = {
        "status": "draft",
        "config": {"title": "Malawi overview", "country": "malawi"},
    }

    with pytest.raises(FormValidationError) as exc_info:
        await view.validate(request, data)

    assert exc_info.value.errors["config"] == (
        "You do not have permission to manage dashboards for this country."
    )


@pytest.mark.asyncio
async def test_gated_update_status_action_rejects_pk_outside_scope(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from unittest.mock import AsyncMock

    view = GatedDashboardAdminView(DashboardModel)
    dashboard = DashboardModel(
        id=uuid4(),
        title="Malawi overview",
        path="malawi/malawi-overview",
        status=DashboardStatus.draft,
        country=DashboardCountry.malawi,
        config={"title": "Malawi overview", "country": "malawi"},
    )
    request = _scoped_dashboard_request(countries=frozenset({"mozambique"}))
    request._form = FormData([("status", "published")])  # noqa: SLF001

    async def _fake_form() -> FormData:
        return request._form  # noqa: SLF001

    request.form = _fake_form  # type: ignore[method-assign]
    monkeypatch.setattr(
        view,
        "find_by_pks",
        AsyncMock(return_value=[dashboard]),
    )

    with pytest.raises(ActionFailed, match="not accessible"):
        await view.update_status_action(request, [str(dashboard.id), str(uuid4())])
