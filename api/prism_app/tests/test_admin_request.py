"""Tests for shared Starlette Admin request helpers."""

from types import SimpleNamespace
from uuid import uuid4

import pytest
from prism_app.auth.admin_request import (
    admin_user_from_request,
    request_has_prism_admin_access,
)
from prism_app.auth.permission_codes import ADMIN_ACCESS
from starlette.requests import Request
from starlette_admin.exceptions import FormValidationError


def _request(*, codes: set[str], user=None) -> Request:
    scope = {"type": "http", "method": "GET", "path": "/", "headers": []}
    request = Request(scope)
    request.state.permission_codes = codes
    if user is not None:
        request.state.prism_user = user
    return request


def test_request_has_prism_admin_access() -> None:
    assert request_has_prism_admin_access(_request(codes={ADMIN_ACCESS})) is True
    assert request_has_prism_admin_access(_request(codes=set())) is False


def test_admin_user_from_request() -> None:
    user = SimpleNamespace(id=uuid4())
    assert admin_user_from_request(_request(codes=set(), user=user)) is user


def test_admin_user_from_request_missing_raises() -> None:
    with pytest.raises(FormValidationError, match="Not authenticated"):
        admin_user_from_request(_request(codes=set()))
