"""Admin map export view queryset and clone helpers."""

from types import SimpleNamespace
from uuid import uuid4

import pytest
from prism_app.admin_bulk_actions import bulk_status_select_form
from prism_app.admin_map_export import (
    MapExportJobView,
    MapExportScheduleView,
    _apply_job_owner_filter,
    _apply_schedule_owner_filter,
    _case_insensitive_build_query,
    _normalize_dekad_interval,
    _validate_dekad_interval,
)
from prism_app.auth.permission_codes import ADMIN_ACCESS, MAP_EXPORTS_MANAGE
from prism_app.database.map_export_job_model import MapExportJob
from prism_app.database.map_export_schedule_model import (
    MAX_DEKAD_INTERVAL,
    MapExportSchedule,
    MapExportScheduleCadence,
    MapExportScheduleStatus,
)
from sqlalchemy import select
from starlette.datastructures import FormData
from starlette.requests import Request
from starlette_admin._types import RequestAction
from starlette_admin.exceptions import ActionFailed, FormValidationError


def _request(
    *,
    admin_access: bool,
    map_exports_manage: bool = False,
    user_id=None,
    query_string: bytes = b"",
) -> Request:
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/",
        "query_string": query_string,
        "headers": [],
    }
    request = Request(scope)
    codes: set[str] = set()
    if admin_access:
        codes.add(ADMIN_ACCESS)
    if map_exports_manage:
        codes.add(MAP_EXPORTS_MANAGE)
    request.state.permission_codes = codes
    if user_id is not None:
        request.state.prism_user = SimpleNamespace(id=user_id)
    return request


def test_schedule_owner_filter_scoped_without_admin_access() -> None:
    owner_id = uuid4()
    request = _request(admin_access=False, user_id=owner_id)
    stmt = _apply_schedule_owner_filter(select(MapExportSchedule), request)
    compiled = str(stmt.compile(compile_kwargs={"literal_binds": True}))
    assert str(owner_id).replace("-", "") in compiled


def test_schedule_owner_filter_unscoped_with_admin_access() -> None:
    request = _request(admin_access=True, user_id=uuid4())
    stmt = _apply_schedule_owner_filter(select(MapExportSchedule), request)
    assert stmt.whereclause is None


def test_job_owner_filter_hides_unowned_for_non_admin() -> None:
    request = _request(admin_access=False, user_id=uuid4())
    stmt = _apply_job_owner_filter(select(MapExportJob), request)
    compiled = str(stmt.compile(compile_kwargs={"literal_binds": True}))
    assert "created_by_user_id" in compiled


def test_schedule_view_allows_delete_for_admin() -> None:
    view = MapExportScheduleView(MapExportSchedule)
    assert view.can_delete(_request(admin_access=True)) is True
    assert view.can_delete(_request(admin_access=False)) is False
    assert (
        view.can_delete(_request(admin_access=False, map_exports_manage=True)) is False
    )


def test_schedule_view_accessible_to_map_export_manager_only() -> None:
    view = MapExportScheduleView(MapExportSchedule)
    manager_request = _request(admin_access=False, map_exports_manage=True)

    assert view.is_accessible(manager_request) is True
    assert view.can_view_details(manager_request) is True
    assert view.can_edit(manager_request) is True


def test_schedule_view_not_accessible_without_map_exports_or_admin() -> None:
    view = MapExportScheduleView(MapExportSchedule)
    assert view.is_accessible(_request(admin_access=False)) is False


def test_normalize_dekad_interval_only_for_every_n_dekads() -> None:
    assert _normalize_dekad_interval(MapExportScheduleCadence.monthly, 3) == 1
    assert _normalize_dekad_interval(MapExportScheduleCadence.every_n_dekads, 3) == 3
    assert _normalize_dekad_interval(MapExportScheduleCadence.every_n_dekads, 99) == (
        MAX_DEKAD_INTERVAL
    )


def test_validate_dekad_interval_bounds() -> None:
    assert _validate_dekad_interval(MapExportScheduleCadence.monthly, 99) is None
    assert (
        _validate_dekad_interval(MapExportScheduleCadence.every_n_dekads, 0) is not None
    )
    assert (
        _validate_dekad_interval(
            MapExportScheduleCadence.every_n_dekads,
            MAX_DEKAD_INTERVAL + 1,
        )
        is not None
    )


def test_schedule_search_query_is_case_insensitive() -> None:
    view = MapExportScheduleView(MapExportSchedule)
    request = _request(admin_access=True)
    clause = view.get_search_query(request, "Mozambique")
    compiled = str(clause.compile(compile_kwargs={"literal_binds": True}))
    assert "lower" in compiled.lower()
    assert "mozambique" in compiled.lower()


def test_schedule_search_query_includes_scheduler_identity() -> None:
    view = MapExportScheduleView(MapExportSchedule)
    request = _request(admin_access=True)
    clause = view.get_search_query(request, "Jane")
    compiled = str(clause.compile(compile_kwargs={"literal_binds": True}))
    assert "users" in compiled.lower()
    assert "jane" in compiled.lower()


def test_schedule_column_filter_is_case_insensitive() -> None:
    clause = _case_insensitive_build_query(
        {"name": {"contains": "Monthly"}},
        MapExportSchedule,
    )
    compiled = str(clause.compile(compile_kwargs={"literal_binds": True}))
    assert "lower" in compiled.lower()
    assert "monthly" in compiled.lower()


def test_schedule_column_filter_eq_null_uses_is_null() -> None:
    clause = _case_insensitive_build_query(
        {"name": {"eq": None}},
        MapExportSchedule,
    )
    compiled = str(clause.compile(compile_kwargs={"literal_binds": True}))
    assert " IS NULL" in compiled
    assert "'none'" not in compiled.lower()


def test_schedule_column_filter_neq_null_uses_is_not_null() -> None:
    clause = _case_insensitive_build_query(
        {"name": {"neq": None}},
        MapExportSchedule,
    )
    compiled = str(clause.compile(compile_kwargs={"literal_binds": True}))
    assert " IS NOT NULL" in compiled
    assert "'none'" not in compiled.lower()


def test_schedule_searchable_fields_include_cadence_and_format() -> None:
    view = MapExportScheduleView(MapExportSchedule)
    assert "cadence" in view.searchable_fields
    assert "format" in view.searchable_fields


def test_schedule_view_has_download_row_action() -> None:
    view = MapExportScheduleView(MapExportSchedule)
    assert view.list_template == "map_export_schedule_list.html"
    assert view.detail_template == "map_export_schedule_detail.html"
    assert "download" in view.row_actions
    assert view._row_actions["download"]["custom_response"] is True


def test_schedule_view_bulk_actions_include_update_status_and_delete() -> None:
    view = MapExportScheduleView(MapExportSchedule)
    assert view.list_template == "map_export_schedule_list.html"
    assert view.actions == ["update_status", "delete"]
    assert "update_status" in view._actions
    assert "delete" in view._actions
    assert view._actions["update_status"]["confirmation"]
    assert view._actions["delete"]["confirmation"]
    assert view._actions["update_status"]["form"] == bulk_status_select_form(
        MapExportScheduleStatus
    )


@pytest.mark.asyncio
async def test_update_status_action_requires_status(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    view = MapExportScheduleView(MapExportSchedule)
    request = _request(admin_access=True)
    request._form = FormData([])  # noqa: SLF001

    async def _fake_form() -> FormData:
        return request._form  # noqa: SLF001

    request.form = _fake_form  # type: ignore[method-assign]

    with pytest.raises(ActionFailed, match="Status is required"):
        await view.update_status_action(request, ["sched-1"])


@pytest.mark.asyncio
async def test_update_status_action_updates_selected_schedules(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from unittest.mock import AsyncMock, MagicMock

    view = MapExportScheduleView(MapExportSchedule)
    schedule = MapExportSchedule(
        id="sched-1",
        name="mozambique precip monthly PDF",
        status="active",
        country="mozambique",
        layer_id="precip_blended_dekad",
        cadence="monthly",
        export_url="http://x/export",
        format="pdf",
        export_options={"origin": "http://x"},
    )
    request = _request(admin_access=True)
    request._form = FormData([("status", "stopped")])  # noqa: SLF001

    async def _fake_form() -> FormData:
        return request._form  # noqa: SLF001

    request.form = _fake_form  # type: ignore[method-assign]

    session = MagicMock()
    request.state.session = session
    monkeypatch.setattr(
        view,
        "find_by_pks",
        AsyncMock(return_value=[schedule]),
    )

    message = await view.update_status_action(request, ["sched-1"])

    assert schedule.status == MapExportScheduleStatus.stopped
    assert schedule.updated_at is not None
    session.add.assert_called_once_with(schedule)
    session.commit.assert_called_once()
    assert "1 schedule" in message
    assert "stopped" in message


def test_schedule_list_hides_country_for_map_export_manager() -> None:
    view = MapExportScheduleView(MapExportSchedule)
    manager_request = _request(admin_access=False, map_exports_manage=True)
    admin_request = _request(admin_access=True)

    manager_fields = {
        f.name for f in view.get_fields_list(manager_request, RequestAction.LIST)
    }
    admin_fields = {
        f.name for f in view.get_fields_list(admin_request, RequestAction.LIST)
    }

    assert "country" not in manager_fields
    assert "country" in admin_fields


def test_schedule_detail_hides_country_for_map_export_manager() -> None:
    view = MapExportScheduleView(MapExportSchedule)
    manager_request = _request(admin_access=False, map_exports_manage=True)
    admin_request = _request(admin_access=True)

    manager_fields = {
        f.name for f in view.get_fields_list(manager_request, RequestAction.DETAIL)
    }
    admin_fields = {
        f.name for f in view.get_fields_list(admin_request, RequestAction.DETAIL)
    }

    assert "country" not in manager_fields
    assert "country" in admin_fields


def test_schedule_search_excludes_country_for_map_export_manager() -> None:
    view = MapExportScheduleView(MapExportSchedule)
    manager_request = _request(admin_access=False, map_exports_manage=True)
    clause = view.get_search_query(manager_request, "mozambique")
    compiled = str(clause.compile(compile_kwargs={"literal_binds": True}))
    assert "country" not in compiled.lower()


def test_schedule_search_includes_country_for_admin() -> None:
    view = MapExportScheduleView(MapExportSchedule)
    admin_request = _request(admin_access=True)
    clause = view.get_search_query(admin_request, "mozambique")
    compiled = str(clause.compile(compile_kwargs={"literal_binds": True}))
    assert "country" in compiled.lower()


def test_schedule_view_can_create_only_with_clone_from() -> None:
    view = MapExportScheduleView(MapExportSchedule)
    assert view.create_template == "map_export_schedule_create.html"
    assert view.can_create(_request(admin_access=True)) is False
    assert (
        view.can_create(_request(admin_access=False, map_exports_manage=True)) is False
    )
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/",
        "query_string": b"clone_from=abc",
        "headers": [],
    }
    request = Request(scope)
    request.state.permission_codes = {ADMIN_ACCESS}
    assert view.can_create(request) is True

    manager_scope = {
        "type": "http",
        "method": "GET",
        "path": "/",
        "query_string": b"clone_from=abc",
        "headers": [],
    }
    manager_request = Request(manager_scope)
    manager_request.state.permission_codes = {MAP_EXPORTS_MANAGE}
    assert view.can_create(manager_request) is True


@pytest.mark.asyncio
async def test_before_create_clone_copies_export_url_and_options(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from contextlib import nullcontext
    from unittest.mock import MagicMock

    view = MapExportScheduleView(MapExportSchedule)
    source = MapExportSchedule(
        id="sched-1",
        name="zimbabwe precip monthly PDF",
        country="zimbabwe",
        layer_id="precip_blended_dekad",
        cadence="monthly",
        export_url="http://x/export?date={date}&hazardLayerIds={layer_id}",
        format="pdf",
        export_options={"origin": "http://x"},
        admin_areas="ZWE01,ZWE02",
    )
    obj = MapExportSchedule(
        name="temp",
        status="active",
        country="mozambique",
        layer_id="precip_blended_1y",
        cadence="monthly",
        format="pdf",
        export_options={},
        export_url="",
    )
    owner_id = uuid4()
    request = _request(
        admin_access=True,
        user_id=owner_id,
        query_string=b"clone_from=sched-1",
    )
    session = MagicMock()
    session.no_autoflush.return_value = nullcontext()
    request.state.session = session

    async def _fake_find_by_pk(_request: Request, pk: str) -> MapExportSchedule:
        assert pk == "sched-1"
        return source

    monkeypatch.setattr(view, "find_by_pk", _fake_find_by_pk)

    await view.before_create(
        request,
        {
            "layer_id": "precip_blended_1y",
            "cadence": "monthly",
            "format": "pdf",
        },
        obj,
    )

    assert obj.export_url == source.export_url
    assert obj.export_options == source.export_options
    assert obj.admin_areas == source.admin_areas
    assert obj.country == "zimbabwe"
    assert obj.created_by_user_id == owner_id


@pytest.mark.asyncio
async def test_load_clone_source_rejects_missing_country(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from contextlib import nullcontext
    from unittest.mock import MagicMock

    view = MapExportScheduleView(MapExportSchedule)
    source = MapExportSchedule(
        id="sched-1",
        name="no country",
        country="",
        layer_id="precip_blended_dekad",
        cadence="monthly",
        export_url="http://x/export",
        format="pdf",
        export_options={"origin": "http://x"},
    )
    request = _request(admin_access=True)
    session = MagicMock()
    session.no_autoflush.return_value = nullcontext()
    request.state.session = session

    async def _fake_find_by_pk(_request: Request, pk: str) -> MapExportSchedule:
        assert pk == "sched-1"
        return source

    monkeypatch.setattr(view, "find_by_pk", _fake_find_by_pk)

    with pytest.raises(FormValidationError, match="missing country"):
        await view._load_clone_source(request, "sched-1")


@pytest.mark.asyncio
async def test_serialize_clone_prefill_clears_layer_and_cadence(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    view = MapExportScheduleView(MapExportSchedule)
    source = MapExportSchedule(
        id="sched-1",
        name="mozambique precip monthly PDF",
        country="mozambique",
        layer_id="precip_blended_dekad",
        cadence="monthly",
        export_url="http://x/export?date={date}&hazardLayerIds={layer_id}",
        format="pdf",
        export_options={"origin": "http://x"},
    )
    request = _request(admin_access=True)
    request.state.action = "CREATE"

    async def _fake_serialize(obj, req, action):  # noqa: ARG001
        return {
            "id": obj.id,
            "name": obj.name,
            "layer_id": obj.layer_id,
            "cadence": getattr(obj.cadence, "value", obj.cadence),
            "dekad_interval": obj.dekad_interval,
            "export_options": obj.export_options,
        }

    monkeypatch.setattr(view, "serialize", _fake_serialize)
    prefill = await view.serialize_clone_prefill(source, request)
    assert prefill["name"].endswith("(clone)")
    assert prefill["layer_id"] == ""
    assert prefill["cadence"] == ""
    assert prefill["export_options"] == source.export_options
