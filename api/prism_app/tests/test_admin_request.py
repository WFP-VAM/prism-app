"""Tests for shared Starlette Admin request helpers."""

from types import SimpleNamespace
from uuid import uuid4

import pytest
from prism_app.auth.admin_request import (
    admin_user_from_request,
    apply_country_scope_filter,
    request_allowed_countries,
    request_has_prism_admin_access,
)
from prism_app.auth.permission_codes import ADMIN_ACCESS, MAP_EXPORTS_MANAGE
from prism_app.auth.permission_scopes import PermissionScopes
from sqlalchemy import column, select
from starlette.requests import Request
from starlette_admin.exceptions import FormValidationError


def _request(
    *,
    codes: set[str],
    scopes: PermissionScopes | None = None,
    user=None,
) -> Request:
    scope = {"type": "http", "method": "GET", "path": "/", "headers": []}
    request = Request(scope)
    request.state.permission_codes = codes
    if scopes is not None:
        request.state.permission_scopes = scopes
    if user is not None:
        request.state.prism_user = user
    return request


def test_request_has_prism_admin_access() -> None:
    assert request_has_prism_admin_access(_request(codes={ADMIN_ACCESS})) is True
    assert request_has_prism_admin_access(_request(codes=set())) is False


def test_request_allowed_countries_star_is_unrestricted() -> None:
    assert (
        request_allowed_countries(
            _request(
                codes={MAP_EXPORTS_MANAGE},
                scopes={MAP_EXPORTS_MANAGE: None},
            ),
            MAP_EXPORTS_MANAGE,
        )
        is None
    )


def test_request_allowed_countries_missing_scope_is_empty() -> None:
    assert (
        request_allowed_countries(
            _request(codes={MAP_EXPORTS_MANAGE}, scopes={}),
            MAP_EXPORTS_MANAGE,
        )
        == frozenset()
    )


def test_apply_country_scope_filter_missing_scope_denies() -> None:
    stmt = select(column("country"))
    filtered = apply_country_scope_filter(
        stmt,
        _request(codes={MAP_EXPORTS_MANAGE}, scopes={}),
        MAP_EXPORTS_MANAGE,
        column("country"),
    )
    sql = str(filtered.compile(compile_kwargs={"literal_binds": True})).lower()
    assert "false" in sql


def test_admin_user_from_request() -> None:
    user = SimpleNamespace(id=uuid4())
    assert admin_user_from_request(_request(codes=set(), user=user)) is user


def test_admin_user_from_request_missing_raises() -> None:
    with pytest.raises(FormValidationError, match="Not authenticated"):
        admin_user_from_request(_request(codes=set()))
