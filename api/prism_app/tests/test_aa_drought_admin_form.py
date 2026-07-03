"""AA drought admin form: country dropdown for admins; inferred for AA managers."""

import pytest

from prism_app.admin import GatedAaDroughtAdminView
from prism_app.auth.permission_codes import AA_DATA_MANAGE, ADMIN_ACCESS
from prism_app.database.aa_drought_model import (
    AaDroughtCountry,
    AaDroughtDatasetModel,
    AaDroughtStatus,
)
from starlette.requests import Request
from starlette_admin._types import RequestAction


def _request(*, codes: set[str], countries: frozenset[str] | None = None) -> Request:
    scope = {"type": "http", "method": "GET", "path": "/admin/", "headers": []}
    request = Request(scope)
    request.state.permission_codes = codes
    if ADMIN_ACCESS in codes:
        request.state.permission_scopes = {}
    elif countries is not None:
        request.state.permission_scopes = {AA_DATA_MANAGE: countries}
    else:
        request.state.permission_scopes = {}
    return request


def test_country_field_visible_for_admin_only() -> None:
    view = GatedAaDroughtAdminView(AaDroughtDatasetModel)
    admin_request = _request(codes={ADMIN_ACCESS})
    manager_request = _request(codes={AA_DATA_MANAGE}, countries=frozenset({"malawi"}))

    for action in (RequestAction.CREATE, RequestAction.EDIT, RequestAction.LIST):
        admin_fields = {f.name for f in view.get_fields_list(admin_request, action)}
        manager_fields = {f.name for f in view.get_fields_list(manager_request, action)}
        assert "country" in admin_fields
        assert "country" not in manager_fields

    # Starlette-admin list config calls get_fields_list(request) without action.
    manager_list_fields = {
        f.name for f in view.get_fields_list(manager_request)
    }
    assert "country" not in manager_list_fields


def test_aa_manager_search_excludes_country_column() -> None:
    view = GatedAaDroughtAdminView(AaDroughtDatasetModel)
    manager_request = _request(codes={AA_DATA_MANAGE}, countries=frozenset({"malawi"}))
    clause = view.get_search_query(manager_request, "malawi")
    compiled = str(clause.compile(compile_kwargs={"literal_binds": True})).lower()
    assert "country" not in compiled
    assert "status" in compiled


@pytest.mark.asyncio
async def test_populate_obj_persists_inferred_country_when_field_hidden() -> None:
    view = GatedAaDroughtAdminView(AaDroughtDatasetModel)
    request = _request(codes={AA_DATA_MANAGE}, countries=frozenset({"malawi"}))
    request.state.action = RequestAction.CREATE
    data: dict = {
        "status": "draft",
        "csv_content": "district,index\nA,B\n",
        "row_count": 1,
    }
    obj = AaDroughtDatasetModel(
        csv_content="district,index\nA,B\n",
        status=AaDroughtStatus.draft,
        row_count=0,
    )
    populated = await view._populate_obj(request, obj, data)
    assert populated.country == AaDroughtCountry.malawi
