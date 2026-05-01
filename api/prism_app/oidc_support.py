"""OIDC discovery, token exchange, and ID token verification for WFP CIAM.

Authoritative product docs: https://docs.ciam.auth.wfp.org/

Use that site for flows, endpoints, registration, and troubleshooting; in particular:

- https://docs.ciam.auth.wfp.org/supported-oidc-flows/ — authorization code and PKCE
- https://docs.ciam.auth.wfp.org/login-workflows/ — RP-initiated logout: end_session_endpoint, id_token_hint, post_logout_redirect_uri
- https://docs.ciam.auth.wfp.org/ciam-getting-started/
- https://docs.ciam.auth.wfp.org/common-errors/

``PRISM_OIDC_ISSUER`` should be the **issuer identifier** string from discovery JSON ``issuer`` —
not necessarily the discovery URL itself. If you paste the full
``…/.well-known/openid-configuration`` URL by mistake, it is truncated before fetching.

For example, CIAM documents discovery at
``https://ciam.auth.wfp.org/oauth2/oidcdiscovery/.well-known/openid-configuration``;
in that case set the issuer to ``https://ciam.auth.wfp.org/oauth2/oidcdiscovery``
(not the generic hostname alone), unless your integration guide specifies otherwise.

Uses **authorization code with PKCE (S256)** on the authorize redirect and passes
``code_verifier`` at the token endpoint, as recommended for [supported OIDC
flows](https://docs.ciam.auth.wfp.org/supported-oidc-flows/). The confidential
client still sends ``client_secret`` at token exchange unless CIAM is configured for
public+PKCE-only.

Token exchange: ``POST`` token endpoint with ``application/x-www-form-urlencoded``
(``grant_type=authorization_code``, ``code``, ``client_id``, ``redirect_uri``, ``code_verifier``, plus ``client_secret`` for confidential clients).
"""

from __future__ import annotations

import base64
import hashlib
import logging
import secrets
import time
from functools import lru_cache
from typing import Any
from uuid import UUID

import httpx
import jwt
from jwt import PyJWKClient

from prism_app.admin_settings import AdminAuthSettings

logger = logging.getLogger(__name__)

# ``PRISM_DEV_SIMPLE_SESSION_COOKIE`` only: ~10 year Max-Age (dev convenience, not a security property).
_DEV_SIMPLE_SESSION_MAX_AGE_SECONDS = 10 * 365 * 24 * 3600

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


DISCOVERY_PATH_SUFFIX = "/.well-known/openid-configuration"


def normalize_issuer_for_discovery(issuer: str) -> str:
    """Return issuer base URL: strip trailing slashes and a duplicated discovery path if pasted by mistake."""
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
    """RFC 7636 PKCE: return ``(code_verifier, code_challenge)`` using method S256."""
    verifier = secrets.token_urlsafe(48)
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    challenge = base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")
    return verifier, challenge


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
    prompt = settings.oidc_authorize_prompt.strip()
    if prompt:
        params["prompt"] = prompt
    q = urlencode(params, quote_via=quote, safe="")
    sep = "&" if "?" in auth_ep else "?"
    return f"{auth_ep}{sep}{q}"


def build_rp_initiated_logout_url(
    settings: AdminAuthSettings,
    id_token_hint: str | None,
) -> str | None:
    """CIAM/OpenID RP-initiated logout via discovery ``end_session_endpoint``.

    Sends ``id_token_hint`` when we have one, and ``post_logout_redirect_uri`` when configured.
    Returns ``None`` if OIDC is not configured or discovery has no end-session endpoint.
    """
    if not settings.oidc_configured:
        return None
    from urllib.parse import quote, urlencode

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
    q = (
        urlencode(params, quote_via=quote)
        if params
        else ""
    )
    sep = "&" if "?" in endpoint else "?"
    return f"{endpoint}{sep}{q}" if q else endpoint


async def exchange_code_for_tokens(
    settings: AdminAuthSettings, code: str, code_verifier: str | None = None
) -> dict[str, Any]:
    doc = get_oidc_discovery_doc(settings.oidc_issuer)
    token_ep = doc["token_endpoint"]
    data = {
        "grant_type": "authorization_code",
        "redirect_uri": settings.oidc_redirect_uri,
        "code": code,
    }
    if code_verifier:
        data["code_verifier"] = code_verifier
    auth = httpx.BasicAuth(settings.oidc_client_id, settings.oidc_client_secret)
    # CIAM rejects "more than one authentication method" if e.g. .netrc / proxy injects Authorization
    # while sending client_secret in the body — use Basic only and isolate from env hooks.
    async with httpx.AsyncClient(trust_env=False, auth=auth) as client:
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
    issuer = doc.get("issuer", normalize_issuer_for_discovery(settings.oidc_issuer))

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
    raw_sub = decoded.get("sub")
    if not isinstance(raw_sub, str):
        raise ValueError('ID token "sub" claim must be a string')
    sub = raw_sub.strip()
    if not sub:
        raise ValueError('ID token "sub" claim is missing or blank after trim')
    decoded["sub"] = sub

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
        options={"require": ["exp", "iat", "state", "nonce", "code_verifier"]},
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
    if settings.dev_simple_session_cookie:
        try:
            uid = UUID(token.strip())
        except ValueError as exc:
            raise jwt.DecodeError("Invalid dev simple session cookie") from exc
        return {"uid": str(uid), "ciam_sub": ""}

    return jwt.decode(
        token,
        settings.session_secret,
        algorithms=["HS256"],
        options={"require": ["exp", "iat", "uid", "ciam_sub"]},
    )


def session_cookie_value_and_max_age(
    settings: AdminAuthSettings, *, user_id: UUID, ciam_sub: str
) -> tuple[str, int]:
    """Return ``(Set-Cookie value, max_age)`` after successful OIDC login."""
    if settings.dev_simple_session_cookie:
        return str(user_id), _DEV_SIMPLE_SESSION_MAX_AGE_SECONDS
    body = {"uid": str(user_id), "ciam_sub": ciam_sub}
    return sign_session_cookie(settings, body), settings.session_ttl_seconds
