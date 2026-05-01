"""FastAPI dependencies for PRISM session and permission checks."""

from __future__ import annotations

from typing import Annotated, Literal
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.engine import Engine
from starlette.responses import Response

from prism_app.admin_settings import AdminAuthSettings, get_admin_auth_settings
from prism_app.database.prism_user_model import PrismUser
from prism_app.prism_auth_service import is_active, load_user_and_permissions

# Starlette SessionMiddleware session dict keys (JSON-serializable).
PRISM_SESSION_USER_ID = "prism_uid"
PRISM_SESSION_CIAM_SUB = "ciam_sub"
# Bound to GET /auth/sign-out → POST /auth/sign-out (consumption via session.pop).
PRISM_SESSION_SIGN_OUT_CSRF = "sign_out_csrf"


def set_prism_session_user(request: Request, *, user_id: UUID, ciam_sub: str) -> None:
    """Persist CIAM-linked Prism user in Starlette signed session (SessionMiddleware cookie)."""
    request.session[PRISM_SESSION_USER_ID] = str(user_id)
    request.session[PRISM_SESSION_CIAM_SUB] = ciam_sub


def clear_prism_browser_session(request: Request) -> None:
    """Drop Prism session payload; SessionMiddleware clears the cookie on response."""
    request.session.clear()


def clear_prism_auth_cookies(
    request: Request, response: Response, settings: AdminAuthSettings
) -> None:
    """Clear Prism session plus OIDC helper cookies."""
    clear_prism_browser_session(request)
    delete_prism_cookie_matching_issue(response, settings, settings.session_cookie_name)
    delete_prism_cookie_matching_issue(response, settings, settings.oidc_state_cookie_name)
    delete_prism_cookie_matching_issue(
        response, settings, settings.oidc_id_token_hint_cookie_name
    )


def clear_oidc_state_cookie(response: Response, settings: AdminAuthSettings) -> None:
    """Remove only the OIDC state cookie (after successful callback when session is kept)."""
    delete_prism_cookie_matching_issue(
        response, settings, settings.oidc_state_cookie_name
    )


def delete_prism_cookie_matching_issue(
    response: Response,
    settings: AdminAuthSettings,
    key: str,
) -> None:
    ss_raw = settings.session_cookie_samesite.lower()
    ss: Literal["lax", "strict", "none"] = (
        ss_raw if ss_raw in ("lax", "strict", "none") else "lax"
    )
    response.delete_cookie(
        key,
        path="/",
        secure=settings.session_cookie_secure,
        httponly=True,
        samesite=ss,
    )


def get_admin_engine(request: Request) -> Engine:
    return request.app.state.admin_engine


def load_prism_user_from_session(
    request: Request, engine: Engine, settings: AdminAuthSettings
) -> tuple[PrismUser | None, set[str], str | None]:
    """Resolve ``prism_uid`` (+ optional ``ciam_sub``) from session → DB user."""
    uid_raw = request.session.get(PRISM_SESSION_USER_ID)
    if uid_raw is None:
        return None, set(), None
    if PRISM_SESSION_CIAM_SUB not in request.session:
        clear_prism_browser_session(request)
        return None, set(), None
    try:
        user_id = UUID(str(uid_raw).strip())
    except ValueError:
        clear_prism_browser_session(request)
        return None, set(), None
    sess_sub_raw = request.session.get(PRISM_SESSION_CIAM_SUB)
    sess_sub = str(sess_sub_raw).strip() if sess_sub_raw is not None else None
    user, codes = load_user_and_permissions(engine, user_id)
    if user is not None and sess_sub and user.ciam_sub != sess_sub:
        clear_prism_browser_session(request)
        return None, set(), None
    return user, codes, sess_sub


def require_prism_session(
    request: Request,
    settings: Annotated[AdminAuthSettings, Depends(get_admin_auth_settings)],
    engine: Annotated[Engine, Depends(get_admin_engine)],
) -> tuple[PrismUser, set[str]]:
    """Load user + permission codes from Starlette session; 401 if missing or inconsistent."""
    if settings.admin_auth_disabled:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Session API not available when PRISM_ADMIN_AUTH_DISABLED is true.",
        )
    user, codes, _ = load_prism_user_from_session(request, engine, settings)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    if not is_active(user):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User inactive or unknown",
        )
    assert user is not None
    return user, codes


def require_permissions(*required: str):
    """Dependency factory: all listed permission codes must be present."""

    def _dep(
        session: Annotated[tuple[PrismUser, set[str]], Depends(require_prism_session)],
    ) -> tuple[PrismUser, set[str]]:
        user, codes = session
        missing = set(required) - codes
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing permissions: {sorted(missing)}",
            )
        return user, codes

    return _dep
