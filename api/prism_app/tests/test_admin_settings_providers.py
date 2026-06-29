"""Tests for the multi-provider OIDC registry on AdminAuthSettings."""

import pytest
from prism_app.auth.admin_settings import (
    PROVIDER_CIAM,
    PROVIDER_ENTRA,
    AdminAuthSettings,
)

_CIAM_KWARGS = {
    "oidc_issuer": "https://ciam.auth.wfp.org/oauth2/oidcdiscovery",
    "oidc_client_id": "ciam-client",
    "oidc_client_secret": "ciam-secret",
    "oidc_redirect_uri": "https://api.example.org/auth/callback",
}

_ENTRA_KWARGS = {
    "entra_oidc_tenant_id": "11111111-2222-3333-4444-555555555555",
    "entra_oidc_client_id": "entra-client",
    "entra_oidc_client_secret": "entra-secret",
}


def _settings(**overrides) -> AdminAuthSettings:
    # Pin every provider field so ambient PRISM_* env vars can't leak into tests.
    base = {
        "oidc_issuer": "",
        "oidc_client_id": "",
        "oidc_client_secret": "",
        "oidc_redirect_uri": "",
        "entra_oidc_tenant_id": "",
        "entra_oidc_client_id": "",
        "entra_oidc_client_secret": "",
    }
    return AdminAuthSettings(_env_file=None, **{**base, **overrides})


def test_no_providers_when_nothing_configured() -> None:
    assert _settings().oidc_providers() == {}


def test_ciam_only_registry_unchanged_by_entra_fields_existing() -> None:
    settings = _settings(**_CIAM_KWARGS)
    providers = settings.oidc_providers()
    assert list(providers) == [PROVIDER_CIAM]
    assert settings.entra_oidc_configured is False
    ciam = providers[PROVIDER_CIAM]
    assert ciam.issuer == _CIAM_KWARGS["oidc_issuer"]
    assert ciam.token_endpoint_auth_method == "client_secret_basic"


def test_entra_provider_derives_single_tenant_issuer() -> None:
    settings = _settings(**_CIAM_KWARGS, **_ENTRA_KWARGS)
    providers = settings.oidc_providers()
    assert set(providers) == {PROVIDER_CIAM, PROVIDER_ENTRA}
    entra = providers[PROVIDER_ENTRA]
    assert entra.issuer == (
        "https://login.microsoftonline.com/" "11111111-2222-3333-4444-555555555555/v2.0"
    )
    # Shares the CIAM callback; same URL must be registered on the Entra app.
    assert entra.redirect_uri == _CIAM_KWARGS["oidc_redirect_uri"]


def test_entra_requires_client_secret_unless_public_client() -> None:
    incomplete = {**_ENTRA_KWARGS, "entra_oidc_client_secret": ""}
    settings = _settings(**_CIAM_KWARGS, **incomplete)
    assert settings.entra_oidc_configured is False
    assert PROVIDER_ENTRA not in settings.oidc_providers()

    public = _settings(
        **_CIAM_KWARGS,
        **incomplete,
        entra_oidc_token_endpoint_auth_method="none",
    )
    entra = public.oidc_providers()[PROVIDER_ENTRA]
    assert entra.client_secret == ""
    assert entra.token_endpoint_auth_method == "none"


def test_entra_requires_shared_redirect_uri() -> None:
    settings = _settings(**_ENTRA_KWARGS)  # no CIAM vars => no redirect URI
    assert settings.entra_oidc_configured is False
    assert settings.oidc_providers() == {}


def test_invalid_token_endpoint_auth_method_rejected() -> None:
    with pytest.raises(ValueError, match="TOKEN_ENDPOINT_AUTH_METHOD"):
        _settings(entra_oidc_token_endpoint_auth_method="client_secret_jwt")
