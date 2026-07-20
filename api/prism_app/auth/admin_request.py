"""Shared helpers for Starlette Admin request context (user + permissions)."""

from __future__ import annotations

from prism_app.auth.permission_codes import (
    ADMIN_ACCESS,
    can_manage_aa_data_in_admin,
    can_manage_dashboards_in_admin,
    can_manage_map_exports_in_admin,
)
from prism_app.auth.permission_scopes import PermissionScopes, can_access_country
from prism_app.database.user_model import User
from sqlalchemy import Select, cast, false, func
from sqlalchemy.types import String
from starlette.requests import Request
from starlette_admin.exceptions import FormValidationError


def _permission_codes(request: Request) -> set[str] | None:
    return getattr(request.state, "permission_codes", None)


def _permission_scopes(request: Request) -> PermissionScopes:
    return getattr(request.state, "permission_scopes", {})


def request_has_prism_admin_access(request: Request) -> bool:
    """Whether the session has ``prism.admin.access`` (defense in depth under admin middleware)."""
    codes = _permission_codes(request)
    return bool(codes and ADMIN_ACCESS in codes)


def request_can_manage_dashboards(request: Request) -> bool:
    """Dashboard model view in admin: full admins or dashboard managers."""
    codes = _permission_codes(request)
    return bool(codes and can_manage_dashboards_in_admin(codes))


def request_can_manage_map_exports(request: Request) -> bool:
    """Map export schedules view in admin: full admins or map export managers."""
    codes = _permission_codes(request)
    return bool(codes and can_manage_map_exports_in_admin(codes))


def request_can_manage_aa_data(request: Request) -> bool:
    """AA drought dataset view in admin: full admins or AA data managers."""
    codes = _permission_codes(request)
    return bool(codes and can_manage_aa_data_in_admin(codes))


def request_allowed_countries(
    request: Request,
    permission_code: str,
) -> frozenset[str] | None:
    """Allowed countries for ``permission_code``; ``None`` means unrestricted.

    Missing ``permission_code`` in scopes is empty (deny), not unrestricted.
    Only an explicit ``None`` value means ``*`` (all countries).
    """
    if request_has_prism_admin_access(request):
        return None
    scopes = _permission_scopes(request)
    if permission_code not in scopes:
        return frozenset()
    return scopes[permission_code]


def request_can_access_country(
    request: Request,
    permission_code: str,
    country: str,
) -> bool:
    codes = _permission_codes(request) or set()
    return can_access_country(
        codes=codes,
        scopes=_permission_scopes(request),
        permission_code=permission_code,
        country=country,
    )


def apply_country_scope_filter(
    stmt: Select,
    request: Request,
    permission_code: str,
    country_column,
) -> Select:
    """Filter a query to rows whose country is in the user's scope."""
    if request_has_prism_admin_access(request):
        return stmt
    allowed = request_allowed_countries(request, permission_code)
    if allowed is None:
        return stmt
    if not allowed:
        return stmt.where(false())
    normalized = func.lower(cast(country_column, String))
    return stmt.where(normalized.in_(allowed))


def admin_user_from_request(request: Request) -> User:
    """Current Prism user from admin middleware; raises a form error if missing."""
    user = getattr(request.state, "prism_user", None)
    if user is None:
        raise FormValidationError({"__all__": "Not authenticated"})
    return user
