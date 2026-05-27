"""Admin map export view queryset and clone helpers."""

from types import SimpleNamespace
from uuid import uuid4

import pytest
from prism_app.admin_map_export import (
    MapExportJobView,
    MapExportScheduleView,
    _apply_job_owner_filter,
    _apply_schedule_owner_filter,
)
from prism_app.auth.permission_codes import ADMIN_ACCESS
from prism_app.database.map_export_job_model import MapExportJob
from prism_app.database.map_export_schedule_model import MapExportSchedule
from sqlalchemy import select
from starlette.requests import Request


def _request(*, admin_access: bool, user_id=None, query_string: bytes = b"") -> Request:
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/",
        "query_string": query_string,
        "headers": [],
    }
    request = Request(scope)
    request.state.permission_codes = {ADMIN_ACCESS} if admin_access else set()
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


def test_schedule_view_can_create_only_with_clone_from() -> None:
    view = MapExportScheduleView(MapExportSchedule)
    assert view.can_create(_request(admin_access=True)) is False
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
