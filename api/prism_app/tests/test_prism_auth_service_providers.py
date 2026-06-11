"""Tests for provider-scoped user identity in prism_auth_service and session deps."""

from __future__ import annotations

from unittest.mock import Mock
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from prism_app.auth.admin_settings import DEFAULT_OIDC_PROVIDER_ID, PROVIDER_ENTRA
from prism_app.auth.deps import (
    PRISM_SESSION_AUTH_PROVIDER,
    PRISM_SESSION_CIAM_SUB,
    PRISM_SESSION_USER_ID,
    load_user_from_session,
    require_prism_session,
)
from prism_app.auth.prism_auth_service import load_user_and_permissions
from prism_app.database.user_model import User
from prism_app.main import app


def test_load_user_and_permissions_rejects_mixed_lookup_args() -> None:
    engine = Mock()
    with pytest.raises(ValueError, match="not both"):
        load_user_and_permissions(
            engine,
            user_id=UUID("00000000-0000-4000-8000-000000000001"),
            ciam_sub="sub",
        )


def test_load_user_from_session_rejects_auth_provider_mismatch(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = User.model_construct(
        id=UUID("00000000-0000-4000-8000-000000000123"),
        auth_provider=PROVIDER_ENTRA,
        ciam_sub="shared-sub",
    )
    request = Mock()
    request.session = {
        PRISM_SESSION_USER_ID: str(user.id),
        PRISM_SESSION_CIAM_SUB: "shared-sub",
        PRISM_SESSION_AUTH_PROVIDER: DEFAULT_OIDC_PROVIDER_ID,
    }

    monkeypatch.setattr(
        "prism_app.auth.deps.load_user_and_permissions",
        lambda engine, user_id: (user, set()),
    )

    loaded, codes, sub = load_user_from_session(request, Mock(), Mock())

    assert loaded is None
    assert codes == set()
    assert request.session == {}


def test_load_user_from_session_accepts_matching_auth_provider(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = User.model_construct(
        id=UUID("00000000-0000-4000-8000-000000000123"),
        auth_provider=PROVIDER_ENTRA,
        ciam_sub="entra-sub",
    )
    request = Mock()
    request.session = {
        PRISM_SESSION_USER_ID: str(user.id),
        PRISM_SESSION_CIAM_SUB: "entra-sub",
        PRISM_SESSION_AUTH_PROVIDER: PROVIDER_ENTRA,
    }

    monkeypatch.setattr(
        "prism_app.auth.deps.load_user_and_permissions",
        lambda engine, user_id: (user, {"prism.admin.access"}),
    )

    loaded, codes, sub = load_user_from_session(request, Mock(), Mock())

    assert loaded is user
    assert codes == {"prism.admin.access"}
    assert sub == "entra-sub"


def test_load_user_from_session_defaults_missing_auth_provider_to_ciam(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = User.model_construct(
        id=UUID("00000000-0000-4000-8000-000000000123"),
        auth_provider=DEFAULT_OIDC_PROVIDER_ID,
        ciam_sub="ciam-sub",
    )
    request = Mock()
    request.session = {
        PRISM_SESSION_USER_ID: str(user.id),
        PRISM_SESSION_CIAM_SUB: "ciam-sub",
    }

    monkeypatch.setattr(
        "prism_app.auth.deps.load_user_and_permissions",
        lambda engine, user_id: (user, set()),
    )

    loaded, _, _ = load_user_from_session(request, Mock(), Mock())

    assert loaded is user


def test_whoami_includes_auth_provider() -> None:
    user = User.model_construct(
        id=UUID("00000000-0000-4000-8000-000000000123"),
        auth_provider=PROVIDER_ENTRA,
        ciam_sub="entra-sub",
        email="staff@example.org",
    )

    def override_prism_session():
        return user, {"prism.admin.access"}

    app.dependency_overrides[require_prism_session] = override_prism_session
    try:
        client = TestClient(app)
        response = client.get("/whoami")
    finally:
        app.dependency_overrides.pop(require_prism_session, None)

    assert response.status_code == 200
    assert response.json() == {
        "user_id": str(user.id),
        "auth_provider": PROVIDER_ENTRA,
        "ciam_sub": "entra-sub",
        "email": "staff@example.org",
        "permissions": ["prism.admin.access"],
    }
