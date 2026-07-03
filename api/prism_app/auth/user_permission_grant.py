"""Validation helpers for country-scoped user permission grants."""

from __future__ import annotations

from uuid import UUID

from prism_app.auth.permission_codes import DASHBOARD_MANAGE, MAP_EXPORTS_MANAGE
from prism_app.auth.permission_scopes import (
    COUNTRY_SCOPED_PERMISSIONS,
    GLOBAL_ALL_COUNTRIES,
    GLOBAL_ONLY_PERMISSIONS,
)
from prism_app.database.dashboard_model import DashboardCountry
from prism_app.database.permission_model import UserPermission
from prism_app.map_export_layer_catalog import schedule_countries
from sqlalchemy import select
from sqlalchemy.orm import Session

_DASHBOARD_COUNTRY_CODES = frozenset(c.value for c in DashboardCountry)


def normalize_grant_country(raw: str | None) -> str:
    trimmed = (raw or GLOBAL_ALL_COUNTRIES).strip()
    if trimmed == GLOBAL_ALL_COUNTRIES:
        return GLOBAL_ALL_COUNTRIES
    return trimmed.lower()


def validate_grant_country_for_permission(
    permission_code: str,
    country: str,
) -> str | None:
    """Return a form error message, or ``None`` when valid."""
    if permission_code in GLOBAL_ONLY_PERMISSIONS:
        if country != GLOBAL_ALL_COUNTRIES:
            return "This permission must use country * (all countries)."
        return None

    if permission_code not in COUNTRY_SCOPED_PERMISSIONS:
        if country != GLOBAL_ALL_COUNTRIES:
            return "Use country * for this permission."
        return None

    if country == GLOBAL_ALL_COUNTRIES:
        return None

    if permission_code == DASHBOARD_MANAGE:
        if country not in _DASHBOARD_COUNTRY_CODES:
            return f"Unknown dashboard country '{country}'."
        return None

    if permission_code == MAP_EXPORTS_MANAGE:
        if country not in schedule_countries():
            return f"Unknown map export country '{country}'."
        return None

    return None


def validate_grant_country_conflicts(
    existing_countries: set[str],
    country: str,
) -> str | None:
    """Reject mixing ``*`` with specific countries for the same user + permission."""
    if country == GLOBAL_ALL_COUNTRIES:
        specific = existing_countries - {GLOBAL_ALL_COUNTRIES}
        if specific:
            return (
                "This user already has country-specific grants for this permission. "
                "Remove them before granting * (all countries)."
            )
        return None

    if GLOBAL_ALL_COUNTRIES in existing_countries:
        return (
            "This user already has unrestricted (*) access for this permission. "
            "Remove that grant before adding country-specific access."
        )

    if country in existing_countries:
        return "This user-permission-country grant already exists."

    return None


def existing_grant_countries(
    session: Session,
    *,
    user_id: UUID,
    permission_id: UUID,
) -> set[str]:
    rows = session.scalars(
        select(UserPermission.country).where(
            UserPermission.user_id == user_id,
            UserPermission.permission_id == permission_id,
        ),
    ).all()
    return set(rows)
