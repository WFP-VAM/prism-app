"""AA drought admin form: country dropdown for admins; inferred for AA managers."""

import pytest
from prism_app.aa_drought.country_scope import (
    aa_drought_country_choices,
    aa_drought_country_field_visible,
)
from prism_app.admin import GatedAaDroughtAdminView
from prism_app.auth.permission_codes import AA_DATA_MANAGE, ADMIN_ACCESS
from prism_app.database.aa_drought_model import (
    AaDroughtCountry,
    AaDroughtDatasetModel,
    AaDroughtStatus,
)
from starlette.requests import Request
from starlette_admin._types import RequestAction

_UNSET = object()


def _request(
    *,
    codes: set[str],
    aa_countries: frozenset[str] | None | object = _UNSET,
) -> Request:
    scope = {"type": "http", "method": "GET", "path": "/admin/", "headers": []}
    request = Request(scope)
    request.state.permission_codes = codes
    if ADMIN_ACCESS in codes:
        request.state.permission_scopes = {}
    elif aa_countries is not _UNSET:
        request.state.permission_scopes = {AA_DATA_MANAGE: aa_countries}
    else:
        request.state.permission_scopes = {}
    return request


def test_country_field_visible_for_admin_and_unrestricted_aa_manager() -> None:
    view = GatedAaDroughtAdminView(AaDroughtDatasetModel)
    admin_request = _request(codes={ADMIN_ACCESS})
    star_request = _request(codes={AA_DATA_MANAGE}, aa_countries=None)
    multi_request = _request(
        codes={AA_DATA_MANAGE},
        aa_countries=frozenset({"malawi", "zambia"}),
    )
    single_request = _request(
        codes={AA_DATA_MANAGE}, aa_countries=frozenset({"malawi"})
    )

    for action in (RequestAction.CREATE, RequestAction.EDIT, RequestAction.LIST):
        admin_fields = {f.name for f in view.get_fields_list(admin_request, action)}
        star_fields = {f.name for f in view.get_fields_list(star_request, action)}
        multi_fields = {f.name for f in view.get_fields_list(multi_request, action)}
        single_fields = {f.name for f in view.get_fields_list(single_request, action)}
        assert "country" in admin_fields
        assert "country" in star_fields
        assert "country" in multi_fields
        assert "country" not in single_fields

    assert aa_drought_country_field_visible(admin_request)
    assert aa_drought_country_field_visible(star_request)
    assert aa_drought_country_field_visible(multi_request)
    assert not aa_drought_country_field_visible(single_request)


def test_aa_drought_country_choices_respects_scope() -> None:
    admin_request = _request(codes={ADMIN_ACCESS})
    star_request = _request(codes={AA_DATA_MANAGE}, aa_countries=None)
    multi_request = _request(
        codes={AA_DATA_MANAGE},
        aa_countries=frozenset({"zambia", "malawi"}),
    )

    all_countries = {code for code, _ in aa_drought_country_choices(admin_request)}
    assert all_countries == {c.value for c in AaDroughtCountry}

    star_countries = {code for code, _ in aa_drought_country_choices(star_request)}
    assert star_countries == {c.value for c in AaDroughtCountry}

    multi_countries = {code for code, _ in aa_drought_country_choices(multi_request)}
    assert multi_countries == {"malawi", "zambia"}


def test_unrestricted_aa_manager_country_field_uses_scoped_choices_loader() -> None:
    view = GatedAaDroughtAdminView(AaDroughtDatasetModel)
    request = _request(codes={AA_DATA_MANAGE}, aa_countries=None)
    country_fields = [
        f
        for f in view.get_fields_list(request, RequestAction.CREATE)
        if f.name == "country"
    ]
    assert len(country_fields) == 1
    assert country_fields[0].choices_loader is aa_drought_country_choices


def test_aa_manager_search_excludes_country_column_for_single_country() -> None:
    view = GatedAaDroughtAdminView(AaDroughtDatasetModel)
    manager_request = _request(
        codes={AA_DATA_MANAGE}, aa_countries=frozenset({"malawi"})
    )
    clause = view.get_search_query(manager_request, "malawi")
    compiled = str(clause.compile(compile_kwargs={"literal_binds": True})).lower()
    assert "country" not in compiled
    assert "status" in compiled


def test_aa_manager_search_includes_country_column_for_unrestricted_scope() -> None:
    view = GatedAaDroughtAdminView(AaDroughtDatasetModel)
    manager_request = _request(codes={AA_DATA_MANAGE}, aa_countries=None)
    clause = view.get_search_query(manager_request, "malawi")
    compiled = str(clause.compile(compile_kwargs={"literal_binds": True})).lower()
    assert "country" in compiled
    assert "status" in compiled


@pytest.mark.asyncio
async def test_populate_obj_persists_inferred_country_when_field_hidden() -> None:
    view = GatedAaDroughtAdminView(AaDroughtDatasetModel)
    request = _request(codes={AA_DATA_MANAGE}, aa_countries=frozenset({"malawi"}))
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


@pytest.mark.asyncio
async def test_populate_obj_keeps_explicit_country_for_unrestricted_aa_manager() -> (
    None
):
    view = GatedAaDroughtAdminView(AaDroughtDatasetModel)
    request = _request(codes={AA_DATA_MANAGE}, aa_countries=None)
    request.state.action = RequestAction.CREATE
    data: dict = {
        "country": AaDroughtCountry.zimbabwe,
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
    assert populated.country == AaDroughtCountry.zimbabwe
