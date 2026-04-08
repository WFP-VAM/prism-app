"""OIDC discovery, token exchange, and ID token verification for WFP CIAM.

Authoritative product docs: https://docs.ciam.auth.wfp.org/

Use that site for flows, endpoints, registration, and troubleshooting; in particular:

- https://docs.ciam.auth.wfp.org/supported-oidc-flows/ — authorization code and PKCE
- https://docs.ciam.auth.wfp.org/login-workflows/
- https://docs.ciam.auth.wfp.org/ciam-getting-started/
- https://docs.ciam.auth.wfp.org/common-errors/

``PRISM_OIDC_ISSUER`` must be the **issuer identifier** string from CIAM’s discovery
document (the same value as the ``issuer`` field inside that JSON). Discovery is
then loaded from ``{issuer}/.well-known/openid-configuration`` (OpenID Connect Discovery).

For example, CIAM documents discovery at
``https://ciam.auth.wfp.org/oauth2/oidcdiscovery/.well-known/openid-configuration``;
in that case set the issuer to ``https://ciam.auth.wfp.org/oauth2/oidcdiscovery``
(not the generic hostname alone), unless your integration guide specifies otherwise.

Token exchange follows the confidential-client pattern: ``POST`` token endpoint with
``application/x-www-form-urlencoded`` body (``grant_type=authorization_code``, ``code``,
``client_id``, ``client_secret``, ``redirect_uri``), as described in the CIAM OIDC docs.
"""

from __future__ import annotations

import logging
import time
from functools import lru_cache
from typing import Any

import httpx
import jwt
from jwt import PyJWKClient

from prism_app.admin_settings import AdminAuthSettings

logger = logging.getLogger(__name__)

# Algorithms we may verify; subset of what PyJWKClient + PyJWT handle for asymmetric keys.
_SUPPORTED_ID_ALGS = frozenset({
    "RS256",
    "RS384",
    "RS512",
    "ES256",
    "ES384",
    "ES512",
    "PS256",
    "PS384",
    "PS512",
})


@lru_cache(maxsize=8)
def get_oidc_discovery_doc(issuer: str) -> dict[str, Any]:
    """Fetch and cache OpenID discovery JSON for the configured issuer."""
    base = issuer.rstrip("/")
    url = f"{base}/.well-known/openid-configuration"
    resp = httpx.get(url, timeout=30.0)
    resp.raise_for_status()
    return resp.json()


def build_authorize_url(
    settings: AdminAuthSettings,
    state: str,
    nonce: str,
    *,
    code_challenge: str | None = None,
    code_challenge_method: str | None = None,
) -> str:
    from urllib.parse import quote, urlencode

    doc = get_oidc_discovery_doc(settings.oidc_issuer)
    auth_ep = doc["authorization_endpoint"]
    params: dict[str, str] = {
        "response_type": "code",
        "client_id": settings.oidc_client_id,
        "redirect_uri": settings.oidc_redirect_uri,
        "scope": settings.oidc_scopes,
        "state": state,
        "nonce": nonce,
    }
    if code_challenge and code_challenge_method:
        params["code_challenge"] = code_challenge
        params["code_challenge_method"] = code_challenge_method
    q = urlencode(params, quote_via=quote, safe="")
    sep = "&" if "?" in auth_ep else "?"
    return f"{auth_ep}{sep}{q}"


async def exchange_code_for_tokens(
    settings: AdminAuthSettings, code: str, code_verifier: str | None = None
) -> dict[str, Any]:
    doc = get_oidc_discovery_doc(settings.oidc_issuer)
    token_ep = doc["token_endpoint"]
    data = {
        "grant_type": "authorization_code",
        "client_id": settings.oidc_client_id,
        "client_secret": settings.oidc_client_secret,
        "redirect_uri": settings.oidc_redirect_uri,
        "code": code,
    }
    if code_verifier:
        data["code_verifier"] = code_verifier
    async with httpx.AsyncClient() as client:
        r = await client.post(
            token_ep,
            data=data,
            headers={
                "Accept": "application/json",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            timeout=30.0,
        )
    if r.status_code >= 400:
        logger.warning("Token endpoint error: %s %s", r.status_code, r.text[:500])
    r.raise_for_status()
    return r.json()


def verify_id_token(
    settings: AdminAuthSettings,
    id_token: str,
    *,
    nonce: str,
) -> dict[str, Any]:
    """Validate signature (JWKS), issuer, audience, expiry, and nonce."""
    doc = get_oidc_discovery_doc(settings.oidc_issuer)
    jwks_uri = doc["jwks_uri"]
    issuer = doc.get("issuer", settings.oidc_issuer.rstrip("/"))

    jwks_client = PyJWKClient(jwks_uri, cache_keys=True)
    signing_key = jwks_client.get_signing_key_from_jwt(id_token)

    advertised = doc.get("id_token_signing_alg_values_supported")
    if isinstance(advertised, list) and advertised:
        algorithms = [a for a in advertised if a in _SUPPORTED_ID_ALGS]
        if not algorithms:
            logger.warning(
                "No supported ID token algs in discovery list %s; using RS256",
                advertised,
            )
            algorithms = ["RS256"]
    else:
        algorithms = ["RS256"]

    decoded = jwt.decode(
        id_token,
        signing_key.key,
        algorithms=algorithms,
        audience=settings.oidc_client_id,
        issuer=issuer,
        options={"require": ["exp", "iat", "sub"]},
        leeway=120,
    )
    if decoded.get("nonce") != nonce:
        raise ValueError("ID token nonce mismatch")
    return decoded


def sign_oidc_state(
    settings: AdminAuthSettings, payload: dict[str, Any]
) -> str:
    now = int(time.time())
    body = {
        **payload,
        "iat": now,
        "exp": now + settings.oidc_state_ttl_seconds,
    }
    return jwt.encode(body, settings.session_secret, algorithm="HS256")


def verify_oidc_state(settings: AdminAuthSettings, token: str) -> dict[str, Any]:
    return jwt.decode(
        token,
        settings.session_secret,
        algorithms=["HS256"],
        options={"require": ["exp", "iat", "state", "nonce"]},
    )


def sign_session_cookie(settings: AdminAuthSettings, payload: dict[str, Any]) -> str:
    now = int(time.time())
    body = {
        **payload,
        "iat": now,
        "exp": now + settings.session_ttl_seconds,
    }
    return jwt.encode(body, settings.session_secret, algorithm="HS256")


def verify_session_cookie(settings: AdminAuthSettings, token: str) -> dict[str, Any]:
    return jwt.decode(
        token,
        settings.session_secret,
        algorithms=["HS256"],
        options={"require": ["exp", "iat", "uid", "ciam_sub"]},
    )
