"""Shared helpers for Starlette Admin request context (user + permissions)."""

from __future__ import annotations

from prism_app.auth.permission_codes import (
    ADMIN_ACCESS,
    can_manage_aa_data_in_admin,
    can_manage_dashboards_in_admin,
    can_manage_map_exports_in_admin,
)
from prism_app.database.user_model import User
from starlette.requests import Request
from starlette_admin.exceptions import FormValidationError


def request_has_prism_admin_access(request: Request) -> bool:
    """Whether the session has ``prism.admin.access`` (defense in depth under admin middleware)."""
    codes = getattr(request.state, "permission_codes", None)
    return bool(codes and ADMIN_ACCESS in codes)


def request_can_manage_dashboards(request: Request) -> bool:
    """Dashboard model view in admin: full admins or dashboard managers."""
    codes = getattr(request.state, "permission_codes", None)
    return bool(codes and can_manage_dashboards_in_admin(codes))


def request_can_manage_map_exports(request: Request) -> bool:
    """Map export schedules view in admin: full admins or map export managers."""
    codes = getattr(request.state, "permission_codes", None)
    return bool(codes and can_manage_map_exports_in_admin(codes))


def request_can_manage_aa_data(request: Request) -> bool:
    """AA drought dataset view in admin: full admins or AA data managers."""
    codes = getattr(request.state, "permission_codes", None)
    return bool(codes and can_manage_aa_data_in_admin(codes))


def admin_user_from_request(request: Request) -> User:
    """Current Prism user from admin middleware; raises a form error if missing."""
    user = getattr(request.state, "prism_user", None)
    if user is None:
        raise FormValidationError({"__all__": "Not authenticated"})
    return user
