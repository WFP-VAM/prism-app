"""OIDC sign-in, callback, and sign-out (FastAPI routes on main app, not under /admin)."""

from __future__ import annotations

import logging
import secrets
from typing import Annotated

import jwt
from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import RedirectResponse, Response

from prism_app.access_pages import (
    access_denied_response,
    access_not_configured_response,
    oidc_not_configured_response,
)
from prism_app.admin_settings import AdminAuthSettings, get_admin_auth_settings
from prism_app.oidc_support import (
    build_authorize_url,
    exchange_code_for_tokens,
    sign_oidc_state,
    sign_session_cookie,
    verify_id_token,
    verify_oidc_state,
)
from prism_app.prism_auth_service import load_user_by_ciam_sub, touch_last_login

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


def _cookie_params(settings: AdminAuthSettings) -> dict:
    return {
        "httponly": True,
        "secure": settings.session_cookie_secure,
        "samesite": settings.session_cookie_samesite.lower(),  # type: ignore[arg-type]
        "path": "/",
    }


def _clear_oidc_cookies(response: Response, settings: AdminAuthSettings) -> None:
    response.delete_cookie(settings.oidc_state_cookie_name, path="/")
    response.delete_cookie(settings.session_cookie_name, path="/")


def _safe_next(next_raw: str | None, default: str = "/admin/") -> str:
    if not next_raw:
        return default
    if next_raw.startswith("/") and not next_raw.startswith("//"):
        return next_raw
    from urllib.parse import urlparse

    p = urlparse(next_raw)
    if p.scheme in ("http", "https") and p.path:
        return p.path + (f"?{p.query}" if p.query else "")
    return default


@router.get("/sign-in")
async def oidc_sign_in(
    request: Request,
    settings: Annotated[AdminAuthSettings, Depends(get_admin_auth_settings)],
    next_url: Annotated[str | None, Query(alias="next")] = None,
) -> Response:
    if settings.admin_auth_disabled:
        return RedirectResponse(url="/admin/", status_code=303)
    if not settings.oidc_configured:
        return oidc_not_configured_response()

    state_plain = secrets.token_urlsafe(32)
    nonce = secrets.token_urlsafe(32)
    next_path = _safe_next(next_url, default="/admin/")
    state_jwt = sign_oidc_state(
        settings,
        {"state": state_plain, "nonce": nonce, "next": next_path},
    )
    authorize = build_authorize_url(settings, state_plain, nonce)
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
        return oidc_not_configured_response()

    raw_state = request.cookies.get(settings.oidc_state_cookie_name)
    if not raw_state or not code or not state:
        logger.warning("OIDC callback missing cookie or params")
        r = access_denied_response(settings.access_support_email)
        _clear_oidc_cookies(r, settings)
        return r

    try:
        state_claims = verify_oidc_state(settings, raw_state)
    except jwt.PyJWTError:
        logger.warning("OIDC state cookie invalid")
        r = access_denied_response(settings.access_support_email)
        _clear_oidc_cookies(r, settings)
        return r

    if state_claims.get("state") != state:
        logger.warning("OIDC state mismatch")
        r = access_denied_response(settings.access_support_email)
        _clear_oidc_cookies(r, settings)
        return r

    nonce = state_claims["nonce"]
    next_path = state_claims.get("next") or "/admin/"

    try:
        tokens = await exchange_code_for_tokens(settings, code)
    except Exception as exc:  # noqa: BLE001
        logger.exception("OIDC token exchange failed: %s", exc)
        r = access_denied_response(settings.access_support_email)
        _clear_oidc_cookies(r, settings)
        return r

    id_token = tokens.get("id_token")
    if not id_token:
        logger.warning("Token response missing id_token")
        r = access_denied_response(settings.access_support_email)
        _clear_oidc_cookies(r, settings)
        return r

    try:
        claims = verify_id_token(settings, id_token, nonce=nonce)
    except Exception as exc:  # noqa: BLE001
        logger.warning("ID token validation failed: %s", exc)
        r = access_denied_response(settings.access_support_email)
        _clear_oidc_cookies(r, settings)
        return r

    ciam_sub = claims["sub"]
    eng = request.app.state.admin_engine
    user, codes = load_user_by_ciam_sub(eng, ciam_sub)

    from prism_app.prism_auth_service import is_active

    if user is None or not is_active(user):
        r = access_denied_response(settings.access_support_email)
        _clear_oidc_cookies(r, settings)
        return r

    touch_last_login(eng, user.id)

    session_body = {
        "uid": str(user.id),
        "ciam_sub": user.ciam_sub,
    }
    session_jwt = sign_session_cookie(settings, session_body)

    if not codes:
        r = RedirectResponse(url="/access-not-configured", status_code=303)
        r.set_cookie(
            key=settings.session_cookie_name,
            value=session_jwt,
            max_age=settings.session_ttl_seconds,
            **_cookie_params(settings),
        )
        r.delete_cookie(settings.oidc_state_cookie_name, path="/")
        return r

    r = RedirectResponse(url=next_path, status_code=303)
    r.set_cookie(
        key=settings.session_cookie_name,
        value=session_jwt,
        max_age=settings.session_ttl_seconds,
        **_cookie_params(settings),
    )
    r.delete_cookie(settings.oidc_state_cookie_name, path="/")
    return r


@router.get("/sign-out")
def oidc_sign_out(
    request: Request,
    settings: Annotated[AdminAuthSettings, Depends(get_admin_auth_settings)],
) -> Response:
    r = RedirectResponse(url="/admin/", status_code=303)
    _clear_oidc_cookies(r, settings)
    return r
