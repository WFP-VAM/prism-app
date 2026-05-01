"""FastAPI dependencies for PRISM session and permission checks."""

from __future__ import annotations

import jwt
from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.engine import Engine
from starlette.responses import Response

from prism_app.admin_settings import AdminAuthSettings, get_admin_auth_settings
from prism_app.database.prism_user_model import PrismUser
from prism_app.oidc_support import verify_session_cookie
from prism_app.prism_auth_service import is_active, load_user_and_permissions


def clear_prism_auth_cookies(response: Response, settings: AdminAuthSettings) -> None:
    """Delete Prism session, OIDC state, and ID-token hint cookies (same attrs as issuance)."""
    for key in (
        settings.session_cookie_name,
        settings.oidc_state_cookie_name,
        settings.oidc_id_token_hint_cookie_name,
    ):
        delete_prism_cookie_matching_issue(response, settings, key)


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
    ss = settings.session_cookie_samesite.lower()
    if ss not in ("lax", "strict", "none"):
        ss = "lax"
    response.delete_cookie(
        key,
        path="/",
        secure=settings.session_cookie_secure,
        httponly=True,
        samesite=ss,  # type: ignore[arg-type]
    )


def get_admin_engine(request: Request) -> Engine:
    return request.app.state.admin_engine


def require_prism_session(
    request: Request,
    settings: Annotated[AdminAuthSettings, Depends(get_admin_auth_settings)],
    engine: Annotated[Engine, Depends(get_admin_engine)],
) -> tuple[PrismUser, set[str]]:
    """Load user + permission codes from session cookie; 401 if missing or invalid."""
    if settings.admin_auth_disabled:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Session API not available when PRISM_ADMIN_AUTH_DISABLED is true.",
        )
    raw = request.cookies.get(settings.session_cookie_name)
    if not raw:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    try:
        claims = verify_session_cookie(settings, raw)
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        ) from exc

    user, codes = load_user_and_permissions(engine, UUID(claims["uid"]))
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
