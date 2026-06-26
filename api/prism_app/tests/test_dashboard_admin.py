"""Admin dashboard view bulk actions."""

from uuid import uuid4

import pytest
from prism_app.admin_bulk_actions import bulk_status_select_form
from prism_app.dashboard.dashboard_admin import DashboardAdminView
from prism_app.database.dashboard_model import (
    DashboardCountry,
    DashboardModel,
    DashboardStatus,
)
from starlette.datastructures import FormData
from starlette.requests import Request
from starlette_admin.exceptions import ActionFailed


def _request() -> Request:
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/",
        "query_string": b"",
        "headers": [],
    }
    return Request(scope)


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
