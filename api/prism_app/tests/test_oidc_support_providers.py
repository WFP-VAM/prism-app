"""Tests for provider-aware OIDC helpers in oidc_support."""

from __future__ import annotations

from urllib.parse import parse_qs, urlparse

import pytest
from prism_app.auth.admin_settings import AdminAuthSettings, OidcProviderConfig
from prism_app.auth.oidc_support import (
    build_authorize_url,
    build_rp_initiated_logout_url,
    exchange_code_for_tokens,
)

_PROVIDER = OidcProviderConfig(
    provider_id="entra",
    display_name="Microsoft Entra ID",
    issuer="https://login.microsoftonline.com/tenant/v2.0",
    client_id="entra-client",
    client_secret="entra-secret",
    redirect_uri="https://api.example.org/auth/callback",
    scopes="openid profile email",
    authorize_prompt="login",
    token_endpoint_auth_method="client_secret_post",
)

_DISCOVERY = {
    "issuer": _PROVIDER.issuer,
    "authorization_endpoint": (
        "https://login.microsoftonline.com/tenant/oauth2/v2.0/authorize"
    ),
    "token_endpoint": "https://login.microsoftonline.com/tenant/oauth2/v2.0/token",
    "end_session_endpoint": (
        "https://login.microsoftonline.com/tenant/oauth2/v2.0/logout"
    ),
    "jwks_uri": "https://login.microsoftonline.com/tenant/discovery/v2.0/keys",
}


def _mock_discovery(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        "prism_app.auth.oidc_support.get_oidc_discovery_doc",
        lambda issuer: _DISCOVERY if issuer == _PROVIDER.issuer else (_ for _ in ()).throw(
            AssertionError(f"unexpected issuer {issuer!r}")
        ),
    )


def test_build_authorize_url_uses_provider_config(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _mock_discovery(monkeypatch)
    url = build_authorize_url(
        _PROVIDER,
        "state123",
        "nonce456",
        code_verifier="verifier789",
    )
    parsed = urlparse(url)
    params = parse_qs(parsed.query)
    assert parsed.netloc == "login.microsoftonline.com"
    assert params["client_id"] == ["entra-client"]
    assert params["redirect_uri"] == [_PROVIDER.redirect_uri]
    assert params["scope"] == [_PROVIDER.scopes]
    assert params["state"] == ["state123"]
    assert params["nonce"] == ["nonce456"]
    assert params["prompt"] == ["login"]
    assert "code_challenge" in params


def test_build_rp_initiated_logout_url_uses_provider_discovery(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _mock_discovery(monkeypatch)
    settings = AdminAuthSettings(
        _env_file=None,
        oidc_post_logout_redirect_uri="https://api.example.org/auth/signed-out",
    )
    url = build_rp_initiated_logout_url(
        _PROVIDER,
        settings,
        "id-token-hint",
        state="logout-state",
    )
    assert url is not None
    parsed = urlparse(url)
    params = parse_qs(parsed.query)
    assert parsed.path.endswith("/logout")
    assert params["id_token_hint"] == ["id-token-hint"]
    assert params["post_logout_redirect_uri"] == [
        "https://api.example.org/auth/signed-out"
    ]
    assert params["state"] == ["logout-state"]


@pytest.mark.asyncio
async def test_exchange_code_for_tokens_honors_auth_method(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _mock_discovery(monkeypatch)
    captured: dict = {}

    class FakeAsyncOAuth2Client:
        def __init__(self, **kwargs):
            captured.update(kwargs)

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def fetch_token(self, *args, **kwargs):
            return {"id_token": "id", "access_token": "access"}

    monkeypatch.setattr(
        "prism_app.auth.oidc_support.AsyncOAuth2Client",
        FakeAsyncOAuth2Client,
    )

    tokens = await exchange_code_for_tokens(
        _PROVIDER, "auth-code", code_verifier="verifier"
    )

    assert tokens["id_token"] == "id"
    assert captured["client_id"] == "entra-client"
    assert captured["client_secret"] == "entra-secret"
    assert captured["token_endpoint_auth_method"] == "client_secret_post"
    assert captured["redirect_uri"] == _PROVIDER.redirect_uri


@pytest.mark.asyncio
async def test_exchange_code_for_tokens_public_client_omits_secret(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _mock_discovery(monkeypatch)
    captured: dict = {}
    public = _PROVIDER.model_copy(
        update={"client_secret": "", "token_endpoint_auth_method": "none"}
    )

    class FakeAsyncOAuth2Client:
        def __init__(self, **kwargs):
            captured.update(kwargs)

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def fetch_token(self, *args, **kwargs):
            return {"id_token": "id"}

    monkeypatch.setattr(
        "prism_app.auth.oidc_support.AsyncOAuth2Client",
        FakeAsyncOAuth2Client,
    )

    await exchange_code_for_tokens(public, "auth-code", code_verifier="verifier")

    assert captured["client_secret"] is None
    assert captured["token_endpoint_auth_method"] == "none"
