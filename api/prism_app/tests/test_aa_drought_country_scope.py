"""Tests for AA drought deployment-country scoping in admin."""

import pytest
from prism_app.aa_drought.aa_drought_admin import AaDroughtAdminView
from prism_app.aa_drought.country_scope import (
    apply_aa_country_filter,
    deployment_aa_country,
    enforce_aa_country_value,
)
from prism_app.auth.permission_codes import AA_DATA_MANAGE, ADMIN_ACCESS
from prism_app.database.aa_drought_model import AaDroughtCountry, AaDroughtDatasetModel
from sqlalchemy import select
from starlette.requests import Request
from starlette_admin._types import RequestAction


def _request(*, codes: set[str]) -> Request:
    scope = {"type": "http", "method": "GET", "path": "/admin/", "headers": []}
    request = Request(scope)
    request.state.permission_codes = codes
    return request


def test_deployment_aa_country_reads_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("REACT_APP_COUNTRY", "malawi")
    assert deployment_aa_country() == AaDroughtCountry.malawi


def test_deployment_aa_country_unknown_returns_none(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("REACT_APP_COUNTRY", "afghanistan")
    assert deployment_aa_country() is None


def test_apply_aa_country_filter_scoped_for_aa_manager(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("REACT_APP_COUNTRY", "malawi")
    request = _request(codes={AA_DATA_MANAGE})
    stmt = apply_aa_country_filter(select(AaDroughtDatasetModel), request)
    compiled = str(stmt.compile(compile_kwargs={"literal_binds": True}))
    assert "malawi" in compiled


def test_apply_aa_country_filter_unscoped_for_admin(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("REACT_APP_COUNTRY", "malawi")
    request = _request(codes={ADMIN_ACCESS})
    stmt = apply_aa_country_filter(select(AaDroughtDatasetModel), request)
    assert stmt.whereclause is None


def test_enforce_aa_country_value_pins_deployment_for_aa_manager(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("REACT_APP_COUNTRY", "malawi")
    request = _request(codes={AA_DATA_MANAGE})
    country, error = enforce_aa_country_value(request, "zambia")
    assert country is None
    assert error is not None


def test_enforce_aa_country_value_allows_admin_choice() -> None:
    request = _request(codes={ADMIN_ACCESS})
    country, error = enforce_aa_country_value(request, "zambia")
    assert error is None
    assert country == AaDroughtCountry.zambia


def test_aa_drought_list_hides_country_for_aa_manager() -> None:
    view = AaDroughtAdminView(AaDroughtDatasetModel)
    manager_request = _request(codes={AA_DATA_MANAGE})
    admin_request = _request(codes={ADMIN_ACCESS})

    manager_fields = {
        field.name for field in view.get_fields_list(manager_request, RequestAction.LIST)
    }
    admin_fields = {
        field.name for field in view.get_fields_list(admin_request, RequestAction.LIST)
    }

    assert "country" not in manager_fields
    assert "country" in admin_fields
