"""Local dev impersonation when ``PRISM_ADMIN_AUTH_DISABLED`` is true."""

from __future__ import annotations

from uuid import UUID

from prism_app.auth.admin_settings import AdminAuthSettings
from prism_app.auth.permission_scopes import PermissionScopes
from prism_app.auth.prism_auth_service import is_active, load_user_and_permissions
from prism_app.database.user_model import User
from sqlalchemy.engine import Engine


def parse_dev_user_id(settings: AdminAuthSettings) -> UUID | None:
    raw = settings.dev_user_id.strip()
    if not raw:
        return None
    return UUID(raw)


def load_dev_impersonation(
    engine: Engine,
    user_id: UUID,
) -> tuple[User, set[str], PermissionScopes] | None:
    user, codes, scopes = load_user_and_permissions(engine, user_id=user_id)
    if user is None or not is_active(user):
        return None
    return user, codes, scopes


def validate_dev_user_settings(settings: AdminAuthSettings) -> None:
    raw = settings.dev_user_id.strip()
    if not raw:
        return
    if settings.admin_auth_disabled is not True:
        raise ValueError(
            "PRISM_DEV_USER_ID requires PRISM_ADMIN_AUTH_DISABLED=true "
            "(local development only)."
        )
    try:
        UUID(raw)
    except ValueError as exc:
        raise ValueError(f"PRISM_DEV_USER_ID is not a valid UUID: {raw!r}") from exc
