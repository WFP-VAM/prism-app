"""Admin AA drought view country scope gating."""

from uuid import uuid4

import pytest
from prism_app.admin import GatedAaDroughtAdminView
from prism_app.auth.permission_codes import AA_DATA_MANAGE, ADMIN_ACCESS
from prism_app.database.aa_drought_model import (
    AaDroughtCountry,
    AaDroughtDatasetModel,
    AaDroughtStatus,
)
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


def _scoped_aa_request(
    *,
    admin_access: bool = False,
    countries: frozenset[str] | None = frozenset({"mozambique"}),
) -> Request:
    request = _request()
    if admin_access:
        request.state.permission_codes = {ADMIN_ACCESS}
        request.state.permission_scopes = {}
    else:
        request.state.permission_codes = {AA_DATA_MANAGE}
        request.state.permission_scopes = {AA_DATA_MANAGE: countries}
    return request


def test_gated_aa_drought_list_query_filters_by_country_scope() -> None:
    view = GatedAaDroughtAdminView(AaDroughtDatasetModel)
    scoped_request = _scoped_aa_request(countries=frozenset({"mozambique"}))
    admin_request = _scoped_aa_request(admin_access=True)

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
async def test_gated_aa_drought_validate_rejects_country_outside_scope() -> None:
    view = GatedAaDroughtAdminView(AaDroughtDatasetModel)
    request = _scoped_aa_request(countries=frozenset({"mozambique"}))
    data = {"country": AaDroughtCountry.malawi, "status": AaDroughtStatus.draft}

    with pytest.raises(FormValidationError) as exc_info:
        await view.validate(request, data)

    assert exc_info.value.errors["country"] == (
        "You do not have permission to manage AA drought data for this country."
    )


@pytest.mark.asyncio
async def test_gated_aa_drought_delete_rejects_pk_outside_scope(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from unittest.mock import AsyncMock

    view = GatedAaDroughtAdminView(AaDroughtDatasetModel)
    dataset = AaDroughtDatasetModel(
        id=uuid4(),
        country=AaDroughtCountry.malawi,
        status=AaDroughtStatus.draft,
        csv_content="district,index\n",
        row_count=0,
    )
    request = _scoped_aa_request(countries=frozenset({"mozambique"}))
    monkeypatch.setattr(
        view,
        "find_by_pks",
        AsyncMock(return_value=[dataset]),
    )

    with pytest.raises(ActionFailed, match="not accessible"):
        await view.delete(request, [str(dataset.id), str(uuid4())])
