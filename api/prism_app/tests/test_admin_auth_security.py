"""Regression tests for admin OIDC security hardening (PR A)."""

import re
from urllib.parse import quote

import pytest
from fastapi.testclient import TestClient
from prism_app.auth import auth_oidc
from prism_app.auth.admin_oidc_auth import PrismAdminAuthProvider
from prism_app.auth.admin_settings import AdminAuthSettings, get_admin_auth_settings
from prism_app.main import app
from sqlalchemy import create_engine

# Session cookies use Secure when PRISM_SESSION_COOKIE_SECURE defaults true; httpx omits Secure
# cookies on http:// URLs, so use HTTPS for any flow that round-trips the session cookie.
_HTTPS = "https://testserver"


def test_prism_admin_auth_provider_does_not_allowlist_admin_api_routes() -> None:
    provider = PrismAdminAuthProvider(
        create_engine("sqlite://"),
        AdminAuthSettings(),
    )
    allowed = provider.allow_routes
    assert allowed is None or "api" not in allowed
    assert allowed is None or "api:file" not in allowed


def test_admin_auth_settings_default_session_cookie_secure() -> None:
    assert AdminAuthSettings().session_cookie_secure is True


def test_production_requires_session_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PRISM_ENV", "production")
    monkeypatch.setenv("PRISM_SESSION_SECRET", "")
    monkeypatch.setenv("PRISM_ADMIN_AUTH_DISABLED", "false")
    get_admin_auth_settings.cache_clear()
    try:
        with pytest.raises(ValueError, match="PRISM_SESSION_SECRET"):
            get_admin_auth_settings()
    finally:
        get_admin_auth_settings.cache_clear()


def test_production_rejects_admin_auth_disabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("PRISM_ENV", "production")
    monkeypatch.setenv("PRISM_SESSION_SECRET", "0123456789abcdef" * 2)
    monkeypatch.setenv("PRISM_ADMIN_AUTH_DISABLED", "true")
    get_admin_auth_settings.cache_clear()
    try:
        with pytest.raises(ValueError, match="PRISM_ADMIN_AUTH_DISABLED"):
            get_admin_auth_settings()
    finally:
        get_admin_auth_settings.cache_clear()


def test_get_sign_out_when_admin_auth_disabled_redirects_without_confirm() -> None:
    """conftest sets PRISM_ADMIN_AUTH_DISABLED — sign-out skips the confirm HTML page."""
    client = TestClient(app, base_url=_HTTPS)
    r = client.get("/auth/sign-out", follow_redirects=False)
    assert r.status_code == 303
    assert r.headers["location"] == "/admin/"


def _oidc_sign_out_test_settings() -> AdminAuthSettings:
    """Configured OIDC (invalid issuer avoids network); enough fields for POST sign-out."""

    return AdminAuthSettings.model_construct(
        admin_auth_disabled=False,
        oidc_issuer="https://example.invalid/oauth2/",
        oidc_client_id="test",
        oidc_client_secret="test",
        oidc_redirect_uri="https://example.invalid/callback",
        session_secret="0123456789abcdef" * 2,
        session_cookie_secure=True,
    )


def test_get_sign_out_when_oidc_enabled_shows_confirm_page() -> None:
    """GET must not mutate session via top-level navigation when OIDC is active."""

    def _fake_admin_auth_settings():
        return _oidc_sign_out_test_settings()

    app.dependency_overrides[get_admin_auth_settings] = _fake_admin_auth_settings
    try:
        client = TestClient(app, base_url=_HTTPS)
        r = client.get("/auth/sign-out")
    finally:
        app.dependency_overrides.pop(get_admin_auth_settings, None)

    assert r.status_code == 200
    assert "Confirm sign out" in r.text
    assert 'method="post"' in r.text.lower()
    assert "/auth/sign-out" in r.text
    assert 'name="csrf_token"' in r.text
    m = re.search(r'name="csrf_token"\s+value="([^"]+)"', r.text)
    assert m is not None and m.group(1)


def test_post_sign_out_oidc_without_csrf_returns_403() -> None:

    def _fake_admin_auth_settings():
        return _oidc_sign_out_test_settings()

    app.dependency_overrides[get_admin_auth_settings] = _fake_admin_auth_settings
    try:
        client = TestClient(app, base_url=_HTTPS)
        r = client.post("/auth/sign-out", data={})
    finally:
        app.dependency_overrides.pop(get_admin_auth_settings, None)

    assert r.status_code == 403
    assert "security token" in r.text.lower()


def test_post_sign_out_oidc_with_csrf_redirects() -> None:

    def _fake_admin_auth_settings():
        return _oidc_sign_out_test_settings()

    app.dependency_overrides[get_admin_auth_settings] = _fake_admin_auth_settings
    try:
        client = TestClient(app, base_url=_HTTPS)
        g = client.get("/auth/sign-out")
        m = re.search(r'name="csrf_token"\s+value="([^"]+)"', g.text)
        assert m is not None
        token = m.group(1)
        r = client.post(
            "/auth/sign-out", data={"csrf_token": token}, follow_redirects=False
        )
    finally:
        app.dependency_overrides.pop(get_admin_auth_settings, None)

    assert r.status_code == 303
    assert r.headers["location"] == "/admin/"


def test_post_sign_out_when_admin_disabled_works_without_csrf() -> None:
    """Local-dev path: no OIDC confirm page, POST must not require CSRF."""
    client = TestClient(app, base_url=_HTTPS)
    r = client.post("/auth/sign-out", data={}, follow_redirects=False)
    assert r.status_code == 303
    assert r.headers["location"] == "/admin/"


def test_get_sign_out_with_admin_next_redirects_to_admin_when_auth_disabled() -> None:
    client = TestClient(app, base_url=_HTTPS)
    r = client.get("/auth/sign-out?next=%2Fadmin%2Flist", follow_redirects=False)
    assert r.status_code == 303
    assert r.headers["location"] == "/admin/list"


def test_get_sign_out_with_prism_next_redirects_to_frontend_when_auth_disabled() -> (
    None
):
    client = TestClient(app, base_url=_HTTPS)
    nxt = "https://staging.dkr9o3t8h8nvn.amplifyapp.com/?printModal=1"
    r = client.get(f"/auth/sign-out?next={quote(nxt, safe='')}", follow_redirects=False)
    assert r.status_code == 303
    assert r.headers["location"] == nxt


def test_signed_out_with_logout_state_redirects_to_next() -> None:
    from prism_app.auth.oidc_support import sign_logout_return_state

    settings = _oidc_sign_out_test_settings()
    nxt = "https://prism.moz.wfp.org/"
    token = sign_logout_return_state(settings, nxt)

    def _fake_admin_auth_settings():
        return settings

    app.dependency_overrides[get_admin_auth_settings] = _fake_admin_auth_settings
    try:
        client = TestClient(app, base_url=_HTTPS)
        r = client.get(f"/auth/signed-out?state={token}", follow_redirects=False)
    finally:
        app.dependency_overrides.pop(get_admin_auth_settings, None)

    assert r.status_code == 303
    assert r.headers["location"] == nxt


def test_safe_next_rejects_protocol_relative_absolute_url() -> None:
    nxt = "https://evil.example//phish.example/login"
    assert auth_oidc._safe_next(nxt) == "/admin/"


def test_safe_next_rejects_traversal_outside_admin() -> None:
    assert auth_oidc._safe_next("/admin/../../../etc/passwd") == "/admin/"


def test_safe_next_allows_admin_subpaths_and_access_page() -> None:
    assert auth_oidc._safe_next("/admin/list/foo") == "/admin/list/foo"
    assert auth_oidc._safe_next("/access-not-configured") == "/access-not-configured"
    # posixpath.normpath collapses a trailing slash on ``/admin/`` to ``/admin``.
    assert auth_oidc._safe_next("/admin/?tab=1") == "/admin?tab=1"


def test_safe_next_allows_export_allowed_domain_frontend_print_modal_return() -> None:
    nxt = "https://prism.moz.wfp.org/?printModal=1&batchMaps=1&schedule=1"
    assert auth_oidc._safe_next(nxt) == nxt


def test_safe_next_allows_localhost_frontend_print_modal_return() -> None:
    nxt = "http://localhost:3000/?printModal=1&batchMaps=1&schedule=1"
    assert auth_oidc._safe_next(nxt) == nxt


def test_safe_next_allows_firebase_preview_frontend_print_modal_return() -> None:
    nxt = "https://staging-prism-frontend--1622-abc.web.app/?printModal=1"
    assert auth_oidc._safe_next(nxt) == nxt


def test_safe_next_rejects_disallowed_frontend_origin() -> None:
    assert (
        auth_oidc._safe_next(
            "https://evil.example/?printModal=1&batchMaps=1&schedule=1",
        )
        == "/admin/"
    )


def test_safe_sign_out_next_allows_admin_paths() -> None:
    assert auth_oidc._safe_sign_out_next("/admin/") == "/admin/"
    assert auth_oidc._safe_sign_out_next("/admin/list/foo") == "/admin/list/foo"


def test_safe_sign_out_next_allows_prism_frontend_without_print_modal() -> None:
    nxt = "https://prism.moz.wfp.org/dashboard"
    assert auth_oidc._safe_sign_out_next(nxt) == nxt


def test_safe_sign_out_next_rejects_disallowed_origin() -> None:
    assert auth_oidc._safe_sign_out_next("https://evil.example/logout") == "/admin/"
