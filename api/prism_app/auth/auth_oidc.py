"""OIDC sign-in, callback, and sign-out (FastAPI routes on main app, not under /admin)."""

from __future__ import annotations

import logging
import secrets
from typing import Annotated

import httpx
import jwt
from authlib.integrations.base_client.errors import OAuthError
from fastapi import APIRouter, Depends, Form, HTTPException, Query, Request
from fastapi.responses import RedirectResponse, Response
from prism_app.auth.access_pages import (
    access_denied_response,
    oidc_session_interrupted_response,
    sign_out_confirm_response,
    sign_out_csrf_failed_response,
    signed_out_response,
)
from prism_app.auth.admin_settings import (
    AdminAuthSettings,
    get_admin_auth_settings,
    log_oidc_configuration_blocked,
)
from prism_app.auth.deps import (
    PRISM_SESSION_SIGN_OUT_CSRF,
    clear_oidc_state_cookie,
    clear_prism_auth_cookies,
    clear_prism_browser_session,
    set_prism_session_user,
)
from prism_app.auth.oidc_support import (
    build_authorize_url,
    build_rp_initiated_logout_url,
    exchange_code_for_tokens,
    generate_pkce_pair,
    sign_oidc_state,
    verify_id_token,
    verify_oidc_state,
)
from prism_app.auth.prism_auth_service import (
    ensure_user_for_oidc,
    is_active,
    touch_last_login,
)

logger = logging.getLogger(__name__)

_OIDC_NOT_CONFIGURED_DETAIL = "OIDC is not configured for this deployment."

router = APIRouter(prefix="/auth", tags=["auth"])


def _cookie_params(settings: AdminAuthSettings) -> dict:
    return {
        "httponly": True,
        "secure": settings.session_cookie_secure,
        "samesite": settings.session_cookie_samesite.lower(),  # type: ignore[arg-type]
        "path": "/",
    }


def _set_id_token_hint_cookie(
    response: Response, settings: AdminAuthSettings, id_token: str
) -> None:
    """Store id_token so POST /auth/sign-out can pass id_token_hint to CIAM."""
    response.set_cookie(
        key=settings.oidc_id_token_hint_cookie_name,
        value=id_token,
        max_age=settings.session_ttl_seconds,
        **_cookie_params(settings),
    )


def _clear_session_and_oidc_state_only(
    request: Request, response: Response, settings: AdminAuthSettings
) -> None:
    clear_prism_browser_session(request)
    clear_oidc_state_cookie(response, settings)


def _consume_sign_out_csrf(request: Request, submitted: str | None) -> bool:
    """POP session CSRF token and compare to form field (one-time, timing-safe)."""
    expected = request.session.pop(PRISM_SESSION_SIGN_OUT_CSRF, None)
    if not isinstance(expected, str) or not expected or submitted is None:
        return False
    got = submitted.strip()
    if len(got) != len(expected):
        return False
    return secrets.compare_digest(expected, got)


def _safe_next(next_raw: str | None, default: str = "/admin/") -> str:
    """Resolve post-login redirect: same host only, no protocol-relative or path traversal escapes.

    Only ``/admin`` (and subpaths) or ``/access-not-configured`` are allowed, matching where
    the OIDC flow may legitimately send the browser after sign-in.
    """
    from posixpath import normpath
    from urllib.parse import unquote, urlparse

    if not next_raw:
        return default
    raw = str(next_raw).strip()
    if not raw:
        return default

    path_part: str
    query: str
    if raw.startswith("/") and not raw.startswith("//"):
        if "?" in raw:
            path_part, _, query = raw.partition("?")
        else:
            path_part, query = raw, ""
    else:
        p = urlparse(raw)
        if p.scheme not in ("http", "https") or not p.path:
            return default
        path_part, query = p.path, p.query or ""

    path = unquote(path_part)
    if "\\" in path or path.startswith("//"):
        return default

    norm = normpath(path)
    if norm in (".", ""):
        return default
    if not norm.startswith("/"):
        norm = "/" + norm
    if norm.startswith("//"):
        return default

    allowed = (
        norm == "/admin"
        or norm.startswith("/admin/")
        or norm == "/access-not-configured"
    )
    if not allowed:
        return default

    if query:
        if any(bad in query for bad in ("//", "\n", "\r")):
            return default
        return f"{norm}?{query}"
    return norm


def _perform_sign_out(request: Request, settings: AdminAuthSettings) -> Response:
    """Clear PRISM auth cookies; redirect to CIAM end_session when OIDC is enabled and configured."""
    if settings.admin_auth_disabled or not settings.oidc_configured:
        r = RedirectResponse(url="/auth/signed-out", status_code=303)
        clear_prism_auth_cookies(request, r, settings)
        return r

    hint_raw = request.cookies.get(settings.oidc_id_token_hint_cookie_name)
    hint_stripped = hint_raw.strip() if isinstance(hint_raw, str) else None
    dest = build_rp_initiated_logout_url(
        settings, hint_stripped if hint_stripped else None
    )
    fallback = "/auth/signed-out"
    url = dest if dest else fallback
    r = RedirectResponse(url=url, status_code=303)
    clear_prism_auth_cookies(request, r, settings)
    return r


@router.get("/sign-in")
async def oidc_sign_in(
    request: Request,
    settings: Annotated[AdminAuthSettings, Depends(get_admin_auth_settings)],
    next_url: Annotated[str | None, Query(alias="next")] = None,
) -> Response:
    if settings.admin_auth_disabled:
        return RedirectResponse(url="/admin/", status_code=303)
    if not settings.oidc_configured:
        log_oidc_configuration_blocked(settings, where="GET /auth/sign-in")
        raise HTTPException(status_code=503, detail=_OIDC_NOT_CONFIGURED_DETAIL)

    state_plain = secrets.token_urlsafe(32)
    nonce = secrets.token_urlsafe(32)
    code_verifier, _code_challenge = generate_pkce_pair()
    next_path = _safe_next(next_url, default="/admin/")
    state_jwt = sign_oidc_state(
        settings,
        {
            "state": state_plain,
            "nonce": nonce,
            "next": next_path,
            "code_verifier": code_verifier,
        },
    )
    authorize = build_authorize_url(
        settings,
        state_plain,
        nonce,
        code_verifier=code_verifier,
    )
    response = RedirectResponse(url=authorize, status_code=303)
    response.set_cookie(
        key=settings.oidc_state_cookie_name,
        value=state_jwt,
        max_age=settings.oidc_state_ttl_seconds,
        **_cookie_params(settings),
    )
    return response


@router.get("/callback")
async def oidc_callback(
    request: Request,
    settings: Annotated[AdminAuthSettings, Depends(get_admin_auth_settings)],
    code: str = "",
    state: str = "",
) -> Response:
    if settings.admin_auth_disabled:
        return RedirectResponse(url="/admin/", status_code=303)
    if not settings.oidc_configured:
        log_oidc_configuration_blocked(settings, where="GET /auth/callback")
        raise HTTPException(status_code=503, detail=_OIDC_NOT_CONFIGURED_DETAIL)

    raw_state = request.cookies.get(settings.oidc_state_cookie_name)
    if not raw_state or not code or not state:
        if code or state:
            logger.warning(
                "OIDC callback missing state cookie or params (often refresh or bookmark)"
            )
        r = oidc_session_interrupted_response()
        clear_prism_auth_cookies(request, r, settings)
        return r

    try:
        state_claims = verify_oidc_state(settings, raw_state)
    except jwt.PyJWTError:
        logger.warning("OIDC state cookie invalid")
        r = oidc_session_interrupted_response()
        clear_prism_auth_cookies(request, r, settings)
        return r

    if state_claims.get("state") != state:
        logger.warning("OIDC state mismatch")
        r = oidc_session_interrupted_response()
        clear_prism_auth_cookies(request, r, settings)
        return r

    nonce = state_claims["nonce"]
    code_verifier = state_claims["code_verifier"]
    next_path = state_claims.get("next") or "/admin/"

    try:
        tokens = await exchange_code_for_tokens(
            settings, code, code_verifier=code_verifier
        )
    except OAuthError as exc:
        err = getattr(exc, "error", None) or ""
        if err == "invalid_grant":
            logger.warning("OIDC token exchange invalid_grant (code reuse or expired)")
        else:
            logger.exception("OIDC token exchange OAuth error: %s", exc)
        r = oidc_session_interrupted_response()
        clear_prism_auth_cookies(request, r, settings)
        return r
    except httpx.HTTPStatusError as exc:
        err = ""
        try:
            err = (exc.response.json() or {}).get("error", "")
        except Exception:  # noqa: BLE001
            err = ""
        if exc.response.status_code == 400 and err == "invalid_grant":
            logger.warning("OIDC token exchange invalid_grant (code reuse or expired)")
        else:
            logger.exception("OIDC token exchange HTTP error: %s", exc)
        r = oidc_session_interrupted_response()
        clear_prism_auth_cookies(request, r, settings)
        return r
    except Exception as exc:  # noqa: BLE001
        logger.exception("OIDC token exchange failed: %s", exc)
        r = oidc_session_interrupted_response()
        clear_prism_auth_cookies(request, r, settings)
        return r

    id_token = tokens.get("id_token")
    if not id_token:
        logger.warning("Token response missing id_token")
        r = oidc_session_interrupted_response()
        clear_prism_auth_cookies(request, r, settings)
        return r

    try:
        claims = verify_id_token(
            settings,
            id_token,
            nonce=nonce,
            access_token=tokens.get("access_token"),
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("ID token validation failed: %s", exc)
        r = oidc_session_interrupted_response()
        clear_prism_auth_cookies(request, r, settings)
        return r

    ciam_sub = claims["sub"]
    eng = request.app.state.admin_engine
    try:
        user, codes = ensure_user_for_oidc(eng, ciam_sub=ciam_sub, claims=claims)
    except ValueError as exc:
        logger.warning(
            "OIDC user provisioning refused (bad subject): %s",
            exc,
        )
        r = oidc_session_interrupted_response()
        clear_prism_auth_cookies(request, r, settings)
        return r

    if user is None:
        logger.error(
            "Prism OIDC: no user row after JIT ensure (ciam_sub prefix=%s)",
            ciam_sub[:64],
        )
        r = access_denied_response(settings.access_support_email)
        _clear_session_and_oidc_state_only(request, r, settings)
        _set_id_token_hint_cookie(r, settings, id_token)
        return r

    if not is_active(user):
        r = access_denied_response(settings.access_support_email)
        _clear_session_and_oidc_state_only(request, r, settings)
        _set_id_token_hint_cookie(r, settings, id_token)
        return r

    touch_last_login(eng, user.id)

    request.session.clear()
    set_prism_session_user(request, user_id=user.id, ciam_sub=user.ciam_sub)

    if not codes:
        r = RedirectResponse(url="/access-not-configured", status_code=303)
        _set_id_token_hint_cookie(r, settings, id_token)
        clear_oidc_state_cookie(r, settings)
        return r

    r = RedirectResponse(url=next_path, status_code=303)
    _set_id_token_hint_cookie(r, settings, id_token)
    clear_oidc_state_cookie(r, settings)
    return r


@router.get("/signed-out")
def oidc_signed_out() -> Response:
    return signed_out_response()


@router.get("/sign-out")
def oidc_sign_out_confirm(
    request: Request,
    settings: Annotated[AdminAuthSettings, Depends(get_admin_auth_settings)],
) -> Response:
    if settings.admin_auth_disabled or not settings.oidc_configured:
        return _perform_sign_out(request, settings)
    csrf = secrets.token_urlsafe(32)
    request.session[PRISM_SESSION_SIGN_OUT_CSRF] = csrf
    return sign_out_confirm_response(csrf)


@router.post("/sign-out")
def oidc_sign_out_post(
    request: Request,
    settings: Annotated[AdminAuthSettings, Depends(get_admin_auth_settings)],
    csrf_token: Annotated[str | None, Form()] = None,
) -> Response:
    if settings.oidc_configured and not settings.admin_auth_disabled:
        csrf = csrf_token.strip() if csrf_token else None
        if not _consume_sign_out_csrf(request, csrf):
            return sign_out_csrf_failed_response()
    return _perform_sign_out(request, settings)
