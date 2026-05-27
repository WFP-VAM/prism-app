"""Permission-code catalog invariants."""

from prism_app.auth.permission_codes import ALL_CAPABILITIES, MAP_EXPORTS_MANAGE


def test_map_exports_manage_permission_is_in_dev_capability_set() -> None:
    assert MAP_EXPORTS_MANAGE == "prism.map_exports.manage"
    assert MAP_EXPORTS_MANAGE in ALL_CAPABILITIES
