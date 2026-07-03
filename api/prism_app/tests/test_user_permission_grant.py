"""Tests for user permission grant validation."""

from uuid import uuid4

import pytest
from prism_app.auth.permission_codes import (
    AA_DATA_MANAGE,
    ADMIN_ACCESS,
    CONTENT_VIEW,
    DASHBOARD_MANAGE,
    MAP_EXPORTS_MANAGE,
)
from prism_app.auth.permission_scopes import GLOBAL_ALL_COUNTRIES
from prism_app.auth.user_permission_grant import (
    normalize_grant_country,
    user_permission_country_choices,
    validate_grant_country_conflicts,
    validate_grant_country_for_permission,
)
from prism_app.database.permission_model import Permission
from prism_app.database.user_model import User


def test_normalize_grant_country_defaults_to_star() -> None:
    assert normalize_grant_country(None) == GLOBAL_ALL_COUNTRIES
    assert normalize_grant_country("  *  ") == GLOBAL_ALL_COUNTRIES
    assert normalize_grant_country("Malawi") == "malawi"


def test_user_permission_country_choices_includes_star_and_known_countries() -> None:
    choices = user_permission_country_choices()
    values = [value for value, _label in choices]
    assert values[0] == GLOBAL_ALL_COUNTRIES
    assert "malawi" in values
    assert "mozambique" in values
    assert values == sorted(values, key=lambda v: (v != GLOBAL_ALL_COUNTRIES, v))


def test_validate_global_only_permission_requires_star() -> None:
    assert (
        validate_grant_country_for_permission(ADMIN_ACCESS, "malawi")
        == "This permission must use country * (all countries)."
    )
    assert validate_grant_country_for_permission(CONTENT_VIEW, "*") is None


def test_validate_dashboard_country() -> None:
    assert validate_grant_country_for_permission(DASHBOARD_MANAGE, "*") is None
    assert validate_grant_country_for_permission(DASHBOARD_MANAGE, "malawi") is None
    assert validate_grant_country_for_permission(
        DASHBOARD_MANAGE, "not-a-country"
    ) == "Unknown dashboard country 'not-a-country'."


def test_validate_map_export_country() -> None:
    assert validate_grant_country_for_permission(MAP_EXPORTS_MANAGE, "mozambique") is None
    assert validate_grant_country_for_permission(
        MAP_EXPORTS_MANAGE, "not-a-country"
    ) == "Unknown map export country 'not-a-country'."


def test_validate_aa_drought_country() -> None:
    assert validate_grant_country_for_permission(AA_DATA_MANAGE, "*") is None
    assert validate_grant_country_for_permission(AA_DATA_MANAGE, "malawi") is None
    assert validate_grant_country_for_permission(
        AA_DATA_MANAGE, "not-a-country"
    ) == "Unknown AA drought country 'not-a-country'."


def test_validate_grant_country_conflicts_star_with_specific() -> None:
    assert validate_grant_country_conflicts({"malawi"}, "*") == (
        "This user already has country-specific grants for this permission. "
        "Remove them before granting * (all countries)."
    )


def test_validate_grant_country_conflicts_specific_with_star() -> None:
    assert validate_grant_country_conflicts({"*"}, "malawi") == (
        "This user already has unrestricted (*) access for this permission. "
        "Remove that grant before adding country-specific access."
    )


def test_validate_grant_country_conflicts_duplicate() -> None:
    assert (
        validate_grant_country_conflicts({"malawi"}, "malawi")
        == "This user-permission-country grant already exists."
    )


@pytest.mark.asyncio
async def test_user_permission_validate_rejects_star_when_specific_exists(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from unittest.mock import MagicMock

    from prism_app.admin import UserPermissionView
    from prism_app.database.permission_model import UserPermission
    from prism_app.tests.test_admin_permissions import _admin_create_request
    from starlette_admin.exceptions import FormValidationError

    view = UserPermissionView(UserPermission)
    request = _admin_create_request()
    request.state.session = MagicMock()
    user = User(id=uuid4(), ciam_sub="ciam-sub")
    permission = Permission(id=uuid4(), code=DASHBOARD_MANAGE, label="Dashboards")
    data = {
        "user": user,
        "permission": permission,
        "country": "*",
        "granted_at": None,
    }

    monkeypatch.setattr(
        "prism_app.admin.existing_grant_countries",
        lambda session, user_id, permission_id: {"malawi"},
    )

    with pytest.raises(FormValidationError) as exc_info:
        await view.validate(request, data)

    assert "country-specific grants" in exc_info.value.errors["country"]
