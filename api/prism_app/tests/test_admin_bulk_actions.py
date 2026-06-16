"""Tests for shared Starlette Admin batch action form helpers."""

from enum import Enum

from prism_app.admin_bulk_actions import bulk_status_select_form
from prism_app.database.dashboard_model import DashboardStatus
from prism_app.database.map_export_schedule_model import MapExportScheduleStatus


class _SampleStatus(str, Enum):
    on = "on"
    off = "off"


def test_bulk_status_select_form_renders_enum_values() -> None:
    form = bulk_status_select_form(DashboardStatus)

    assert 'name="status"' in form
    assert 'id="bulk-status"' in form
    for status in DashboardStatus:
        assert f'value="{status.value}"' in form
        assert f">{status.value}</option>" in form


def test_bulk_status_select_form_renders_tuple_labels() -> None:
    form = bulk_status_select_form([("active", "Active"), ("stopped", "Stopped")])

    assert 'value="active"' in form
    assert ">Active</option>" in form
    assert 'value="stopped"' in form
    assert ">Stopped</option>" in form


def test_dashboard_view_uses_shared_bulk_status_form() -> None:
    from prism_app.dashboard.dashboard_admin import (
        _DASHBOARD_BULK_UPDATE_STATUS_FORM,
        DashboardAdminView,
    )
    from prism_app.database.dashboard_model import DashboardModel

    view = DashboardAdminView(DashboardModel)
    assert view._actions["update_status"]["form"] == _DASHBOARD_BULK_UPDATE_STATUS_FORM


def test_map_export_view_uses_shared_bulk_status_form() -> None:
    from prism_app.admin_map_export import (
        _MAP_EXPORT_BULK_UPDATE_STATUS_FORM,
        MapExportScheduleView,
    )
    from prism_app.database.map_export_schedule_model import MapExportSchedule

    view = MapExportScheduleView(MapExportSchedule)
    assert view._actions["update_status"]["form"] == _MAP_EXPORT_BULK_UPDATE_STATUS_FORM


def test_map_export_bulk_form_includes_schedule_statuses() -> None:
    form = bulk_status_select_form(MapExportScheduleStatus)

    assert 'value="active"' in form
    assert 'value="stopped"' in form


def test_bulk_status_select_form_supports_string_choices() -> None:
    form = bulk_status_select_form(_SampleStatus)

    assert 'value="on"' in form
    assert 'value="off"' in form
