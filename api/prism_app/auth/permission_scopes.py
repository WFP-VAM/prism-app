"""Country scope on user permission grants (``*`` = all countries)."""

from __future__ import annotations

from collections.abc import Iterable

from prism_app.auth.permission_codes import (
    ADMIN_ACCESS,
    AA_DATA_MANAGE,
    CONTENT_VIEW,
    DASHBOARD_MANAGE,
    DEPLOYMENT_MANAGE,
    MAP_EXPORTS_MANAGE,
    USERS_MANAGE,
)

GLOBAL_ALL_COUNTRIES = "*"

PermissionScopes = dict[str, frozenset[str] | None]

COUNTRY_SCOPED_PERMISSIONS = frozenset(
    {
        AA_DATA_MANAGE,
        DASHBOARD_MANAGE,
        MAP_EXPORTS_MANAGE,
    }
)

GLOBAL_ONLY_PERMISSIONS = frozenset(
    {
        ADMIN_ACCESS,
        CONTENT_VIEW,
        DEPLOYMENT_MANAGE,
        USERS_MANAGE,
    }
)


def build_permission_scopes(rows: Iterable[tuple[str, str]]) -> PermissionScopes:
    """Build ``{code: allowed countries | None}`` from grant rows."""
    scoped: dict[str, set[str]] = {}
    unrestricted: set[str] = set()
    for code, country in rows:
        if country == GLOBAL_ALL_COUNTRIES:
            unrestricted.add(code)
        else:
            scoped.setdefault(code, set()).add(country.lower())
    scopes: PermissionScopes = {}
    for code in unrestricted | scoped.keys():
        if code in unrestricted:
            scopes[code] = None
        else:
            scopes[code] = frozenset(scoped[code])
    return scopes


def scopes_for_api(scopes: PermissionScopes) -> dict[str, list[str] | None]:
    return {
        code: None if countries is None else sorted(countries)
        for code, countries in sorted(scopes.items())
    }


def can_access_country(
    *,
    codes: set[str] | frozenset[str],
    scopes: PermissionScopes,
    permission_code: str,
    country: str,
) -> bool:
    """Whether ``country`` is allowed for ``permission_code`` (global admin bypasses)."""
    if ADMIN_ACCESS in codes:
        return True
    if permission_code not in codes:
        return False
    allowed = scopes.get(permission_code)
    if allowed is None:
        return True
    if not allowed:
        return False
    return country.strip().lower() in allowed
