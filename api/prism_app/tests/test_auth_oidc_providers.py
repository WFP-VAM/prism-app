"""Tests for multi-provider OIDC auth routes."""

from __future__ import annotations

import jwt
import pytest
from unittest.mock import Mock

from fastapi.testclient import TestClient
from prism_app.auth.admin_settings import (
    PROVIDER_CIAM,
    PROVIDER_ENTRA,
    AdminAuthSettings,
    get_admin_auth_settings,
)
from prism_app.auth.auth_oidc import _perform_sign_out
from prism_app.auth.deps import PRISM_SESSION_AUTH_PROVIDER
from prism_app.main import app

_HTTPS = "https://testserver"


def _multi_provider_settings() -> AdminAuthSettings:
    return AdminAuthSettings(
        _env_file=None,
        oidc_issuer="https://ciam.example.invalid/oauth2/",
        oidc_client_id="ciam-client",
        oidc_client_secret="ciam-secret",
        oidc_redirect_uri="https://api.example.invalid/auth/callback",
        entra_oidc_tenant_id="11111111-2222-3333-4444-555555555555",
        entra_oidc_client_id="entra-client",
        entra_oidc_client_secret="entra-secret",
        session_secret="0123456789abcdef" * 2,
        session_cookie_secure=True,
        admin_auth_disabled=False,
    )


def test_sign_in_unknown_provider_returns_404(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = _multi_provider_settings()

    def _fake_settings():
        return settings

    monkeypatch.setattr(
        "prism_app.auth.auth_oidc.build_authorize_url",
        lambda *args, **kwargs: "https://idp.example/authorize",
    )
    app.dependency_overrides[get_admin_auth_settings] = _fake_settings
    try:
        client = TestClient(app, base_url=_HTTPS)
        r = client.get("/auth/sign-in?provider=okta", follow_redirects=False)
    finally:
        app.dependency_overrides.pop(get_admin_auth_settings, None)

    assert r.status_code == 404
    assert "okta" in r.json()["detail"]


def test_sign_in_stores_provider_in_state_cookie(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = _multi_provider_settings()
    captured: dict = {}

    def _fake_build_authorize_url(provider, state, nonce, *, code_verifier):
        captured["provider_id"] = provider.provider_id
        return "https://idp.example/authorize"

    def _fake_settings():
        return settings

    monkeypatch.setattr(
        "prism_app.auth.auth_oidc.build_authorize_url",
        _fake_build_authorize_url,
    )
    app.dependency_overrides[get_admin_auth_settings] = _fake_settings
    try:
        client = TestClient(app, base_url=_HTTPS)
        r = client.get(
            "/auth/sign-in?provider=entra&next=%2Fadmin%2F",
            follow_redirects=False,
        )
        state_cookie = r.cookies.get(settings.oidc_state_cookie_name)
        assert state_cookie is not None
        claims = jwt.decode(
            state_cookie,
            settings.session_secret,
            algorithms=["HS256"],
        )
    finally:
        app.dependency_overrides.pop(get_admin_auth_settings, None)

    assert r.status_code == 303
    assert captured["provider_id"] == PROVIDER_ENTRA
    assert claims["provider"] == PROVIDER_ENTRA


def test_sign_in_defaults_to_ciam_provider(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = _multi_provider_settings()
    captured: dict = {}

    def _fake_build_authorize_url(provider, state, nonce, *, code_verifier):
        captured["provider_id"] = provider.provider_id
        return "https://idp.example/authorize"

    def _fake_settings():
        return settings

    monkeypatch.setattr(
        "prism_app.auth.auth_oidc.build_authorize_url",
        _fake_build_authorize_url,
    )
    app.dependency_overrides[get_admin_auth_settings] = _fake_settings
    try:
        client = TestClient(app, base_url=_HTTPS)
        r = client.get("/auth/sign-in", follow_redirects=False)
    finally:
        app.dependency_overrides.pop(get_admin_auth_settings, None)

    assert r.status_code == 303
    assert captured["provider_id"] == PROVIDER_CIAM


def test_perform_sign_out_uses_session_auth_provider(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = _multi_provider_settings()
    captured: dict = {}

    def _fake_logout_url(provider, admin_settings, id_token_hint, **kwargs):
        captured["provider_id"] = provider.provider_id
        return "https://idp.example/logout"

    monkeypatch.setattr(
        "prism_app.auth.auth_oidc.build_rp_initiated_logout_url",
        _fake_logout_url,
    )

    request = Mock()
    request.session = {PRISM_SESSION_AUTH_PROVIDER: PROVIDER_ENTRA}
    request.cookies = {}

    response = _perform_sign_out(request, settings, "/auth/welcome")

    assert response.status_code == 303
    assert captured["provider_id"] == PROVIDER_ENTRA
    assert response.headers["location"] == "https://idp.example/logout"


def test_perform_sign_out_defaults_to_ciam_when_session_has_no_provider(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = _multi_provider_settings()
    captured: dict = {}

    def _fake_logout_url(provider, admin_settings, id_token_hint, **kwargs):
        captured["provider_id"] = provider.provider_id
        return "https://idp.example/logout"

    monkeypatch.setattr(
        "prism_app.auth.auth_oidc.build_rp_initiated_logout_url",
        _fake_logout_url,
    )

    request = Mock()
    request.session = {}
    request.cookies = {}

    _perform_sign_out(request, settings, "/auth/welcome")

    assert captured["provider_id"] == PROVIDER_CIAM


def test_welcome_page_shows_provider_buttons() -> None:
    settings = _multi_provider_settings()

    def _fake_settings():
        return settings

    app.dependency_overrides[get_admin_auth_settings] = _fake_settings
    try:
        client = TestClient(app, base_url=_HTTPS)
        r = client.get("/auth/welcome?next=%2Fadmin%2F")
    finally:
        app.dependency_overrides.pop(get_admin_auth_settings, None)

    assert r.status_code == 200
    assert "Choose how to sign in" in r.text
    assert "Partner sign-in (CIAM)" in r.text
    assert "Staff sign-in (Entra ID)" in r.text
    assert "/auth/sign-in?provider=ciam&amp;next=%2Fadmin" in r.text
    assert "/auth/sign-in?provider=entra&amp;next=%2Fadmin" in r.text
