"""OIDC discovery, token exchange, and ID token verification for WFP CIAM.

Authoritative product docs: https://docs.ciam.auth.wfp.org/

Uses **Authlib** for the OAuth2 client (authorize URL with PKCE S256 via ``OAuth2Client``,
``AsyncOAuth2Client`` token exchange with ``client_secret_basic``) and **joserfc**
with Authlib ``CodeIDToken`` for JWKS-backed signature verification and claim validation.

``PRISM_OIDC_ISSUER`` should match discovery JSON ``issuer``. A mistakenly pasted
``.well-known/openid-configuration`` suffix is stripped before fetching discovery.

Token exchange: authorization code grant with optional ``code_verifier`` (PKCE), confidential
client authenticated with HTTP Basic per Authlib defaults.
"""

from __future__ import annotations

import logging
import secrets
import time
from functools import lru_cache
from typing import Any
from urllib.parse import quote, urlencode

import httpx
import jwt
from authlib.integrations.httpx_client import AsyncOAuth2Client
from authlib.oauth2.client import OAuth2Client
from authlib.oauth2.rfc7636 import create_s256_code_challenge
from authlib.oidc.core import CodeIDToken
from joserfc import jwt as joserfc_jwt
from joserfc.errors import InvalidKeyIdError
from joserfc.jwk import KeySet

from prism_app.admin_settings import AdminAuthSettings

logger = logging.getLogger(__name__)

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

DISCOVERY_PATH_SUFFIX = "/.well-known/openid-configuration"


def normalize_issuer_for_discovery(issuer: str) -> str:
    """Return issuer base URL: strip trailing slashes and a duplicated discovery path if pasted."""
    base = issuer.strip().rstrip("/")
    suf = DISCOVERY_PATH_SUFFIX
    while base.casefold().endswith(suf.casefold()):
        base = base[: -len(suf)].rstrip("/")
    return base


@lru_cache(maxsize=8)
def get_oidc_discovery_doc(issuer: str) -> dict[str, Any]:
    """Fetch and cache OpenID discovery JSON for the configured issuer."""
    base = normalize_issuer_for_discovery(issuer)
    url = f"{base}{DISCOVERY_PATH_SUFFIX}"
    resp = httpx.get(url, timeout=30.0)
    resp.raise_for_status()
    return resp.json()


def generate_pkce_pair() -> tuple[str, str]:
    """RFC 7636 PKCE: ``(code_verifier, code_challenge)`` using S256 via Authlib."""
    verifier = secrets.token_urlsafe(48)
    return verifier, create_s256_code_challenge(verifier)


def build_authorize_url(
    settings: AdminAuthSettings,
    state: str,
    nonce: str,
    *,
    code_challenge: str | None = None,
    code_challenge_method: str | None = None,
    code_verifier: str | None = None,
) -> str:
    """Build the CIAM authorization redirect URL."""
    doc = get_oidc_discovery_doc(settings.oidc_issuer)
    auth_ep = doc["authorization_endpoint"]
    token_ep = doc["token_endpoint"]

    prompt = settings.oidc_authorize_prompt.strip()
    extra: dict[str, str] = {}
    if prompt:
        extra["prompt"] = prompt

    if code_verifier:
        if code_challenge or code_challenge_method:
            logger.warning(
                "Both code_verifier and code_challenge passed; using code_verifier for Authlib PKCE"
            )
        client = OAuth2Client(
            session=None,
            client_id=settings.oidc_client_id,
            redirect_uri=settings.oidc_redirect_uri,
            scope=settings.oidc_scopes,
            code_challenge_method="S256",
            authorization_endpoint=auth_ep,
            token_endpoint=token_ep,
        )
        uri, _ = client.create_authorization_url(
            auth_ep,
            state=state,
            nonce=nonce,
            code_verifier=code_verifier,
            **extra,
        )
        return uri

    if code_challenge and code_challenge_method:
        params: dict[str, str] = {
            "response_type": "code",
            "client_id": settings.oidc_client_id,
            "redirect_uri": settings.oidc_redirect_uri,
            "scope": settings.oidc_scopes,
            "state": state,
            "nonce": nonce,
            "code_challenge": code_challenge,
            "code_challenge_method": code_challenge_method,
        }
        if prompt:
            params["prompt"] = prompt
        q = urlencode(params, quote_via=quote, safe="")
        sep = "&" if "?" in auth_ep else "?"
        return f"{auth_ep}{sep}{q}"

    params = {
        "response_type": "code",
        "client_id": settings.oidc_client_id,
        "redirect_uri": settings.oidc_redirect_uri,
        "scope": settings.oidc_scopes,
        "state": state,
        "nonce": nonce,
    }
    if prompt:
        params["prompt"] = prompt
    q = urlencode(params, quote_via=quote, safe="")
    sep = "&" if "?" in auth_ep else "?"
    return f"{auth_ep}{sep}{q}"


def build_rp_initiated_logout_url(
    settings: AdminAuthSettings,
    id_token_hint: str | None,
) -> str | None:
    """RP-initiated logout via discovery ``end_session_endpoint``."""
    if not settings.oidc_configured:
        return None

    try:
        doc = get_oidc_discovery_doc(settings.oidc_issuer)
    except Exception as exc:  # noqa: BLE001
        logger.warning("OIDC discovery failed while building logout URL: %s", exc)
        return None
    ep = doc.get("end_session_endpoint")
    if not isinstance(ep, str) or not ep.strip():
        logger.warning(
            'OpenID discovery has no usable "end_session_endpoint"; RP logout unavailable.'
        )
        return None
    endpoint = ep.strip()
    params: dict[str, str] = {}
    hint = id_token_hint.strip() if isinstance(id_token_hint, str) else ""
    if hint:
        params["id_token_hint"] = hint
    post = settings.oidc_post_logout_redirect_uri.strip()
    if post:
        params["post_logout_redirect_uri"] = post
    q = urlencode(params, quote_via=quote) if params else ""
    sep = "&" if "?" in endpoint else "?"
    return f"{endpoint}{sep}{q}" if q else endpoint


async def exchange_code_for_tokens(
    settings: AdminAuthSettings, code: str, code_verifier: str | None = None
) -> dict[str, Any]:
    """Exchange authorization code for tokens using Authlib ``AsyncOAuth2Client``."""
    doc = get_oidc_discovery_doc(settings.oidc_issuer)
    auth_ep = doc["authorization_endpoint"]
    token_ep = doc["token_endpoint"]
    async with AsyncOAuth2Client(
        client_id=settings.oidc_client_id,
        client_secret=settings.oidc_client_secret,
        redirect_uri=settings.oidc_redirect_uri,
        scope=settings.oidc_scopes,
        token_endpoint_auth_method="client_secret_basic",
        code_challenge_method="S256",
        authorization_endpoint=auth_ep,
        token_endpoint=token_ep,
        trust_env=False,
        timeout=30.0,
    ) as client:
        token = await client.fetch_token(
            token_ep,
            grant_type="authorization_code",
            code=code,
            redirect_uri=settings.oidc_redirect_uri,
            code_verifier=code_verifier,
        )
    return dict(token)


def verify_id_token(
    settings: AdminAuthSettings,
    id_token: str,
    *,
    nonce: str,
    access_token: str | None = None,
) -> dict[str, Any]:
    """Validate JWKS signature and OIDC ``CodeIDToken`` claims (issuer, audience, expiry, nonce)."""
    doc = get_oidc_discovery_doc(settings.oidc_issuer)
    jwks_uri = doc["jwks_uri"]
    issuer = doc.get("issuer", normalize_issuer_for_discovery(settings.oidc_issuer))

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

    resp = httpx.get(jwks_uri, timeout=30.0)
    resp.raise_for_status()
    key_set = KeySet.import_key_set(resp.json())

    try:
        decoded = joserfc_jwt.decode(id_token, key=key_set, algorithms=algorithms)
    except InvalidKeyIdError:
        resp = httpx.get(jwks_uri, timeout=30.0)
        resp.raise_for_status()
        key_set = KeySet.import_key_set(resp.json())
        decoded = joserfc_jwt.decode(id_token, key=key_set, algorithms=algorithms)

    claims_options: dict[str, Any] = {}
    if issuer:
        claims_options["iss"] = {"values": [issuer]}

    claims_params: dict[str, Any] = {
        "nonce": nonce,
        "client_id": settings.oidc_client_id,
    }
    if access_token:
        claims_params["access_token"] = access_token

    oid_claims = CodeIDToken(decoded.claims, decoded.header, claims_options, claims_params)
    oid_claims.validate(leeway=120)

    out = dict(oid_claims)
    raw_sub = out.get("sub")
    if not isinstance(raw_sub, str):
        raise ValueError('ID token "sub" claim must be a string')
    sub = raw_sub.strip()
    if not sub:
        raise ValueError('ID token "sub" claim is missing or blank after trim')
    out["sub"] = sub
    return out


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
        options={"require": ["exp", "iat", "state", "nonce", "code_verifier"]},
    )


__all__ = [
    "DISCOVERY_PATH_SUFFIX",
    "build_authorize_url",
    "build_rp_initiated_logout_url",
    "exchange_code_for_tokens",
    "generate_pkce_pair",
    "get_oidc_discovery_doc",
    "normalize_issuer_for_discovery",
    "sign_oidc_state",
    "verify_id_token",
    "verify_oidc_state",
]
