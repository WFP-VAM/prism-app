"""OIDC sign-in, callback, and sign-out (FastAPI routes on main app, not under /admin)."""

from __future__ import annotations

import logging
import secrets
from posixpath import normpath
from typing import Annotated
from urllib.parse import parse_qs, quote, unquote, urlparse

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
    welcome_response,
)
from prism_app.auth.admin_settings import (
    PROVIDER_CIAM,
    AdminAuthSettings,
    get_admin_auth_settings,
    log_oidc_configuration_blocked,
)
from prism_app.auth.deps import (
    PRISM_SESSION_SIGN_OUT_CSRF,
    PRISM_SESSION_SIGN_OUT_NEXT,
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
    sign_logout_return_state,
    sign_oidc_state,
    verify_id_token,
    verify_logout_return_state,
    verify_oidc_state,
)
from prism_app.auth.prism_auth_service import (
    ensure_user_for_oidc,
    is_active,
    touch_last_login,
)
from prism_app.utils import EXPORT_ALLOWED_DOMAINS, is_domain_allowed

logger = logging.getLogger(__name__)

_OIDC_NOT_CONFIGURED_DETAIL = "OIDC is not configured for this deployment."

router = APIRouter(prefix="/auth", tags=["auth"])

AUTH_WELCOME_PATH = "/auth/welcome"


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


def _is_allowed_frontend_redirect_origin(origin: str) -> bool:
    """True when origin hostname matches map-export allowlist (plus localhost)."""
    p = urlparse(origin)
    if p.scheme not in ("http", "https") or not p.netloc:
        return False
    hostname = p.hostname
    if not hostname:
        return False
    if hostname in ("localhost", "127.0.0.1", "::1"):
        return True
    if not EXPORT_ALLOWED_DOMAINS:
        return False
    return is_domain_allowed(hostname, EXPORT_ALLOWED_DOMAINS)


def _is_frontend_print_modal_return(norm_path: str, query: str) -> bool:
    """Redirect to frontend print modal based if query param is present"""
    if norm_path != "/" or not query:
        return False
    parsed = parse_qs(query, keep_blank_values=True)
    return parsed.get("printModal") == ["1"]


def _safe_next(next_raw: str | None, default: str = "/admin/") -> str:
    """Resolve post-login redirect: same host only, no protocol-relative or path traversal escapes.

    ``/admin`` (and subpaths) and ``/access-not-configured`` are allowed for the
    admin app. For the React app, only hostnames in ``EXPORT_ALLOWED_DOMAINS``
    (plus localhost) may receive the print-modal return intent.
    """
    if not next_raw:
        return default
    raw = str(next_raw).strip()
    if not raw:
        return default

    origin: str | None = None
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
        origin = f"{p.scheme}://{p.netloc}"
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

    admin_allowed = (
        norm == "/admin"
        or norm.startswith("/admin/")
        or norm == "/access-not-configured"
    )
    if query:
        if any(bad in query for bad in ("//", "\n", "\r")):
            return default

    if admin_allowed:
        return f"{norm}?{query}" if query else norm

    frontend_allowed = (
        origin is not None
        and _is_allowed_frontend_redirect_origin(origin)
        and _is_frontend_print_modal_return(norm, query)
    )
    if frontend_allowed:
        return f"{origin}{norm}?{query}"
    return default


def _safe_sign_out_next(
    next_raw: str | None, *, default: str = AUTH_WELCOME_PATH
) -> str:
    """Resolve post-logout destination: admin welcome page, admin paths, or allowlisted PRISM SPA URLs."""
    if not next_raw:
        return default
    raw = str(next_raw).strip()
    if not raw:
        return default

    if raw.startswith("/") and not raw.startswith("//"):
        path_only = raw.split("?", 1)[0]
        path = unquote(path_only)
        if "\\" in path or path.startswith("//"):
            return default
        norm = normpath(path)
        if norm in (".", ""):
            return default
        if not norm.startswith("/"):
            norm = "/" + norm
        if norm.startswith("//"):
            return default
        if (
            norm == "/admin"
            or norm.startswith("/admin/")
            or norm == "/access-not-configured"
            or norm == AUTH_WELCOME_PATH
        ):
            return raw
        return default

    parsed = urlparse(raw)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        return default
    origin = f"{parsed.scheme}://{parsed.netloc}"
    if not _is_allowed_frontend_redirect_origin(origin):
        return default
    return raw


def _signed_out_callback_url(request: Request) -> str:
    return f"{str(request.base_url).rstrip('/')}/auth/signed-out"


def _perform_sign_out(
    request: Request, settings: AdminAuthSettings, return_to: str
) -> Response:
    """Clear PRISM auth cookies; redirect to CIAM end_session when OIDC is enabled and configured."""
    if settings.admin_auth_disabled or not settings.oidc_configured:
        r = RedirectResponse(url=return_to, status_code=303)
        clear_prism_auth_cookies(request, r, settings)
        return r

    hint_raw = request.cookies.get(settings.oidc_id_token_hint_cookie_name)
    hint_stripped = hint_raw.strip() if isinstance(hint_raw, str) else None
    logout_state = sign_logout_return_state(settings, return_to)
    post_logout = (
        settings.oidc_post_logout_redirect_uri.strip()
        or _signed_out_callback_url(request)
    )
    dest = build_rp_initiated_logout_url(
        settings.oidc_providers()[PROVIDER_CIAM],
        settings,
        hint_stripped if hint_stripped else None,
        state=logout_state,
        post_logout_redirect_uri=post_logout,
    )
    url = dest if dest else return_to
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
    provider = settings.oidc_providers()[PROVIDER_CIAM]
    authorize = build_authorize_url(
        provider,
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

    provider = settings.oidc_providers()[PROVIDER_CIAM]

    try:
        tokens = await exchange_code_for_tokens(
            provider, code, code_verifier=code_verifier
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
            provider,
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


@router.get("/welcome")
def oidc_welcome(
    next_url: Annotated[str | None, Query(alias="next")] = None,
) -> Response:
    sign_in_next = _safe_next(next_url, default="/admin/")
    sign_in_href = f"/auth/sign-in?next={quote(sign_in_next, safe='')}"
    return welcome_response(sign_in_href=sign_in_href)


@router.get("/signed-out", name="oidc_signed_out")
def oidc_signed_out(
    request: Request,
    settings: Annotated[AdminAuthSettings, Depends(get_admin_auth_settings)],
    state: str = "",
) -> Response:
    if state.strip():
        try:
            claims = verify_logout_return_state(settings, state.strip())
            next_raw = claims.get("next")
            if isinstance(next_raw, str) and next_raw.strip():
                return RedirectResponse(
                    url=_safe_sign_out_next(next_raw.strip()),
                    status_code=303,
                )
        except jwt.PyJWTError:
            logger.warning("OIDC logout return state invalid or expired")
    return signed_out_response()


@router.get("/sign-out")
def oidc_sign_out_confirm(
    request: Request,
    settings: Annotated[AdminAuthSettings, Depends(get_admin_auth_settings)],
    next_url: Annotated[str | None, Query(alias="next")] = None,
) -> Response:
    return_to = _safe_sign_out_next(next_url)
    if settings.admin_auth_disabled or not settings.oidc_configured:
        return _perform_sign_out(request, settings, return_to)
    csrf = secrets.token_urlsafe(32)
    request.session[PRISM_SESSION_SIGN_OUT_CSRF] = csrf
    request.session[PRISM_SESSION_SIGN_OUT_NEXT] = return_to
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
    return_to_raw = request.session.pop(PRISM_SESSION_SIGN_OUT_NEXT, None)
    return_to = _safe_sign_out_next(
        str(return_to_raw).strip() if return_to_raw is not None else None
    )
    return _perform_sign_out(request, settings, return_to)
