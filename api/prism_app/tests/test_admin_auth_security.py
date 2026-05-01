"""Regression tests for admin OIDC security hardening (PR A)."""

import os

# main.py imports kobo at module load time; provide placeholders for unit tests.
os.environ.setdefault("KOBO_USERNAME", "pytest")
os.environ.setdefault("KOBO_PASSWORD", "pytest")

from fastapi.testclient import TestClient
from sqlalchemy import create_engine

from prism_app.admin_oidc_auth import PrismAdminAuthProvider
from prism_app.admin_settings import AdminAuthSettings, get_admin_auth_settings
from prism_app.main import app


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


def test_get_sign_out_when_admin_auth_disabled_redirects_without_confirm() -> None:
    """conftest sets PRISM_ADMIN_AUTH_DISABLED — sign-out skips the confirm HTML page."""
    client = TestClient(app)
    r = client.get("/auth/sign-out", follow_redirects=False)
    assert r.status_code == 303
    assert r.headers["location"] == "/auth/signed-out"


def test_get_sign_out_when_oidc_enabled_shows_confirm_page() -> None:
    """GET must not mutate session via top-level navigation when OIDC is active."""

    class _OidcOnSettings:
        admin_auth_disabled = False
        oidc_configured = True

    def _fake_admin_auth_settings():
        return _OidcOnSettings()

    app.dependency_overrides[get_admin_auth_settings] = _fake_admin_auth_settings
    try:
        client = TestClient(app)
        r = client.get("/auth/sign-out")
    finally:
        app.dependency_overrides.pop(get_admin_auth_settings, None)

    assert r.status_code == 200
    assert "Confirm sign out" in r.text
    assert 'method="post"' in r.text.lower()
    assert "/auth/sign-out" in r.text
