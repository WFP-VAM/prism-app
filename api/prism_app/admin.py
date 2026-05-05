"""Starlette Admin: read-only views for the alerts Postgres tables."""

from prism_app.auth.permission_codes import ADMIN_ACCESS
from prism_app.database.alert_model import AlertModel
from prism_app.database.anticipatory_action_alerts_model import AnticipatoryActionAlerts
from prism_app.database.permission_model import Permission, UserPermission
from prism_app.database.prism_user_model import PrismUser
from prism_app.database.user_info_model import UserInfoModel
from starlette.requests import Request
from starlette_admin.contrib.sqla import Admin, ModelView


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


class UserInfoView(ReadOnlyModelView):
    label = "User info"
    exclude_fields_from_list = ("password", "salt")
    exclude_fields_from_detail = ("password", "salt")


class AnticipatoryActionAlertsView(ReadOnlyModelView):
    label = "Anticipatory action alerts"
    exclude_fields_from_list = ("last_states",)


class PrismUserEditView(PrismGatedModelView):
    """CIAM-mapped users: provision metadata; permissions use User permissions."""

    label = "PRISM users (CIAM)"
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


def register_alerts_admin_views(admin: Admin) -> None:
    admin.add_view(AlertView(AlertModel))
    admin.add_view(UserInfoView(UserInfoModel))
    admin.add_view(AnticipatoryActionAlertsView(AnticipatoryActionAlerts))
    admin.add_view(PrismUserEditView(PrismUser))
    admin.add_view(PermissionView(Permission))
    admin.add_view(UserPermissionView(UserPermission))
