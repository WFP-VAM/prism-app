"""Starlette Admin: read-only views for the alerts Postgres tables."""

from typing import Any

from prism_app.auth.permission_codes import ADMIN_ACCESS
from prism_app.database.alert_model import AlertModel
from prism_app.database.anticipatory_action_alerts_model import AnticipatoryActionAlerts
from prism_app.database.kobo_user_model import KoboUser
from prism_app.database.map_export_schedule_model import MapExportSchedule
from prism_app.database.permission_model import Permission, UserPermission
from prism_app.database.user_model import User
from prism_app.export_jobs.schedule_admin_form import (
    apply_map_export_schedule_admin_form,
    map_export_schedule_admin_form_errors,
)
from prism_app.export_jobs.schedule_service import (
    refresh_schedule_next_run_at,
    reprepare_schedule_for_retry,
)
from prism_app.utils import utc_now
from pydantic import ValidationError
from starlette.requests import Request
from starlette_admin.actions import row_action
from starlette_admin.contrib.sqla import Admin, ModelView
from starlette_admin.exceptions import ActionFailed, FormValidationError


def _request_has_prism_admin_access(request: Request) -> bool:
    """Defense in depth: middleware already requires ``prism.admin.access`` for admin routes."""
    codes = getattr(request.state, "permission_codes", None)
    return bool(codes and ADMIN_ACCESS in codes)


class PrismGatedModelView(ModelView):
    """Internal admin models: list/detail and mutations require ``prism.admin.access``."""

    def is_accessible(self, request: Request) -> bool:
        return _request_has_prism_admin_access(request)

    def can_view_details(self, request: Request) -> bool:
        return _request_has_prism_admin_access(request)

    def can_create(self, request: Request) -> bool:
        return _request_has_prism_admin_access(request)

    def can_edit(self, request: Request) -> bool:
        return _request_has_prism_admin_access(request)

    def can_delete(self, request: Request) -> bool:
        return _request_has_prism_admin_access(request)


class ReadOnlyModelView(PrismGatedModelView):
    """List and detail only; no create/edit/delete."""

    def can_create(self, request: Request) -> bool:
        return False

    def can_edit(self, request: Request) -> bool:
        return False

    def can_delete(self, request: Request) -> bool:
        return False


class AlertView(ReadOnlyModelView):
    label = "Alerts"
    exclude_fields_from_list = ("alert_config", "zones")


class KoboUserView(ReadOnlyModelView):
    label = "Kobo users"
    exclude_fields_from_list = ("password", "salt")
    exclude_fields_from_detail = ("password", "salt")


class AnticipatoryActionAlertsView(ReadOnlyModelView):
    label = "Anticipatory action alerts"
    exclude_fields_from_list = ("last_states",)


class UserEditView(PrismGatedModelView):
    """CIAM-mapped users: provision metadata; permissions use User permissions."""

    label = "Users (CIAM)"
    edit_template = "edit_no_add_another.html"  # hides "Save and add another"
    exclude_fields_from_edit = (
        "id",
        "ciam_sub",
        "created_at",
        "updated_at",
    )

    def can_create(self, request: Request) -> bool:
        return False

    def can_delete(self, request: Request) -> bool:
        return False


class PermissionView(ReadOnlyModelView):
    label = "Permissions"
    exclude_fields_from_list = ("id",)


class UserPermissionView(PrismGatedModelView):
    """Grant or revoke capability codes (e.g. ``prism.admin.access``, ``prism.content.view``)."""

    label = "User permissions"
    fields = ("user", "permission", "granted_at")
    exclude_fields_from_create = ("granted_at",)  # auto-set to now() by DB default


class MapExportScheduleView(PrismGatedModelView):
    label = "Map export schedules"
    fields = (
        "name",
        "cron_expression",
        "max_runs",
        "runs_completed",
        "next_run_at",
        "last_run_at",
        "request_payload_json",
        "created_at",
        "updated_at",
    )
    exclude_fields_from_list = ("request_payload_json", "created_at", "updated_at")
    exclude_fields_from_create = (
        "runs_completed",
        "last_run_at",
        "next_run_at",
        "created_at",
        "updated_at",
    )
    exclude_fields_from_edit = (
        "runs_completed",
        "last_run_at",
        "next_run_at",
        "created_at",
        "updated_at",
    )
    searchable_fields = ("name", "cron_expression")
    sortable_fields = (
        "name",
        "cron_expression",
        "max_runs",
        "runs_completed",
        "next_run_at",
        "last_run_at",
    )
    row_actions = ["view", "edit", "retry_schedule", "delete"]

    async def validate(self, request: Request, data: dict[str, Any]) -> None:
        try:
            apply_map_export_schedule_admin_form(data)
        except ValidationError as exc:
            raise FormValidationError(
                map_export_schedule_admin_form_errors(exc)
            ) from exc

    async def before_create(
        self,
        request: Request,
        data: dict[str, Any],
        obj: Any,
    ) -> None:
        obj.runs_completed = 0
        refresh_schedule_next_run_at(obj)

    async def before_edit(
        self,
        request: Request,
        data: dict[str, Any],
        obj: Any,
    ) -> None:
        refresh_schedule_next_run_at(obj)
        obj.updated_at = utc_now()

    @row_action(
        name="retry_schedule",
        text="Retry schedule",
        confirmation="Recompute the next run time and resume firing this schedule?",
        icon_class="fa-solid fa-rotate-right",
        submit_btn_class="btn-warning",
    )
    async def retry_schedule_row_action(self, request: Request, pk: Any) -> str:
        schedule = await self.find_by_pk(request, pk)
        if schedule.next_run_at is not None:
            raise ActionFailed("This schedule already has a next run time.")
        try:
            reprepare_schedule_for_retry(schedule)
        except ValueError as exc:
            raise ActionFailed(str(exc)) from exc
        session = request.state.session
        session.add(schedule)
        session.commit()
        return (
            "Schedule will run again at the next computed time (UTC). "
            f"next_run_at={schedule.next_run_at.isoformat()}"
        )


def register_alerts_admin_views(admin: Admin) -> None:
    admin.add_view(AlertView(AlertModel))
    admin.add_view(KoboUserView(KoboUser))
    admin.add_view(AnticipatoryActionAlertsView(AnticipatoryActionAlerts))
    admin.add_view(UserEditView(User))
    admin.add_view(PermissionView(Permission))
    admin.add_view(UserPermissionView(UserPermission))
    admin.add_view(MapExportScheduleView(MapExportSchedule))
