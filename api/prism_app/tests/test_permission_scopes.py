"""Tests for country scope loading and helpers."""

from prism_app.auth.permission_codes import (
    ADMIN_ACCESS,
    DASHBOARD_MANAGE,
    MAP_EXPORTS_MANAGE,
)
from prism_app.auth.permission_scopes import (
    GLOBAL_ALL_COUNTRIES,
    build_permission_scopes,
    can_access_country,
    scopes_for_api,
)


def test_build_permission_scopes_unrestricted() -> None:
    scopes = build_permission_scopes(
        [(DASHBOARD_MANAGE, GLOBAL_ALL_COUNTRIES)],
    )
    assert scopes == {DASHBOARD_MANAGE: None}


def test_build_permission_scopes_specific_countries() -> None:
    scopes = build_permission_scopes(
        [
            (DASHBOARD_MANAGE, "malawi"),
            (DASHBOARD_MANAGE, "Mozambique"),
        ],
    )
    assert scopes == {DASHBOARD_MANAGE: frozenset({"malawi", "mozambique"})}


def test_build_permission_scopes_star_wins_over_specific() -> None:
    scopes = build_permission_scopes(
        [
            (MAP_EXPORTS_MANAGE, "malawi"),
            (MAP_EXPORTS_MANAGE, GLOBAL_ALL_COUNTRIES),
        ],
    )
    assert scopes == {MAP_EXPORTS_MANAGE: None}


def test_scopes_for_api() -> None:
    assert scopes_for_api({DASHBOARD_MANAGE: frozenset({"malawi", "zambia"})}) == {
        DASHBOARD_MANAGE: ["malawi", "zambia"],
    }
    assert scopes_for_api({DASHBOARD_MANAGE: None}) == {DASHBOARD_MANAGE: None}


def test_can_access_country_global_admin_bypass() -> None:
    assert can_access_country(
        codes={ADMIN_ACCESS},
        scopes={},
        permission_code=DASHBOARD_MANAGE,
        country="malawi",
    )


def test_can_access_country_scoped_grant() -> None:
    scopes = {DASHBOARD_MANAGE: frozenset({"malawi"})}
    assert can_access_country(
        codes={DASHBOARD_MANAGE},
        scopes=scopes,
        permission_code=DASHBOARD_MANAGE,
        country="malawi",
    )
    assert not can_access_country(
        codes={DASHBOARD_MANAGE},
        scopes=scopes,
        permission_code=DASHBOARD_MANAGE,
        country="mozambique",
    )
