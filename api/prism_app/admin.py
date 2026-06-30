"""Starlette Admin: read-only alerts; full CRUD for dashboards."""

from prism_app.aa_drought.aa_drought_admin import (
    AaDroughtAdminView,
    register_aa_drought_admin_routes,
)
from prism_app.auth.admin_request import (
    request_can_manage_aa_data,
    request_can_manage_dashboards,
    request_has_prism_admin_access,
)
from prism_app.dashboard.dashboard_admin import DashboardAdminView
from prism_app.database.aa_drought_model import AaDroughtDatasetModel
from prism_app.database.alert_model import AlertModel
from prism_app.database.anticipatory_action_alerts_model import AnticipatoryActionAlerts
from prism_app.database.dashboard_model import DashboardModel
from prism_app.database.kobo_user_model import KoboUser
from prism_app.database.permission_model import Permission, UserPermission
from prism_app.database.user_model import User
from starlette.requests import Request
from starlette_admin import HasOne
from starlette_admin.contrib.sqla import Admin, ModelView
from starlette_admin.exceptions import FormValidationError


class PrismGatedModelView(ModelView):
    """Internal admin models: require ``prism.admin.access`` (not dashboard-only)."""

    def is_accessible(self, request: Request) -> bool:
        return request_has_prism_admin_access(request)

    def can_view_details(self, request: Request) -> bool:
        return request_has_prism_admin_access(request)

    def can_create(self, request: Request) -> bool:
        return request_has_prism_admin_access(request)

    def can_edit(self, request: Request) -> bool:
        return request_has_prism_admin_access(request)

    def can_delete(self, request: Request) -> bool:
        return request_has_prism_admin_access(request)


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
    """OIDC-provisioned users: edit metadata; permissions use User permissions."""

    label = "Users"
    edit_template = "edit_no_add_another.html"  # Save + Cancel only
    exclude_fields_from_list = ("ciam_sub",)
    exclude_fields_from_detail = ("ciam_sub",)
    exclude_fields_from_edit = (
        "id",
        "auth_provider",
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


class GatedDashboardAdminView(DashboardAdminView):
    """Dashboard CRUD for ``prism.admin.access`` or ``prism.dashboard.manage`` only."""

    def is_accessible(self, request: Request) -> bool:
        return request_can_manage_dashboards(request)

    def can_view_details(self, request: Request) -> bool:
        return request_can_manage_dashboards(request)

    def can_create(self, request: Request) -> bool:
        return request_can_manage_dashboards(request)

    def can_edit(self, request: Request) -> bool:
        return request_can_manage_dashboards(request)

    def can_delete(self, request: Request) -> bool:
        return request_can_manage_dashboards(request)


class GatedAaDroughtAdminView(AaDroughtAdminView):
    """AA drought dataset CRUD for ``prism.admin.access`` or ``prism.aa_data.manage`` only."""

    def is_accessible(self, request: Request) -> bool:
        return request_can_manage_aa_data(request)

    def can_view_details(self, request: Request) -> bool:
        return request_can_manage_aa_data(request)

    def can_create(self, request: Request) -> bool:
        return request_can_manage_aa_data(request)

    def can_edit(self, request: Request) -> bool:
        return request_can_manage_aa_data(request)

    def can_delete(self, request: Request) -> bool:
        return request_can_manage_aa_data(request)


class UserPermissionView(PrismGatedModelView):
    """Grant or revoke capability codes (e.g. ``prism.admin.access``, ``prism.content.view``)."""

    label = "User permissions"
    fields = (
        HasOne("user", label="User", identity="user"),
        HasOne("permission", label="Permission", identity="permission"),
        "granted_at",
    )
    exclude_fields_from_create = ("granted_at",)  # auto-set to now() by DB default

    async def _populate_obj(
        self,
        request: Request,
        obj: UserPermission,
        data: dict,
        is_edit: bool = False,
    ) -> UserPermission:
        obj = await super()._populate_obj(request, obj, data, is_edit)
        user = data.get("user")
        permission = data.get("permission")
        if user is not None:
            obj.user_id = user.id
        if permission is not None:
            obj.permission_id = permission.id
        return obj

    async def validate(self, request: Request, data: dict) -> None:
        errors: dict[str, str] = {}
        if data.get("user") is None:
            errors["user"] = "Select a user."
        if data.get("permission") is None:
            errors["permission"] = "Select a permission."
        if errors:
            raise FormValidationError(errors)
        await super().validate(request, data)


def register_alerts_admin_views(admin: Admin) -> None:
    register_aa_drought_admin_routes(admin)
    admin.add_view(AlertView(AlertModel))
    admin.add_view(KoboUserView(KoboUser))
    admin.add_view(AnticipatoryActionAlertsView(AnticipatoryActionAlerts))
    admin.add_view(GatedDashboardAdminView(DashboardModel))
    admin.add_view(GatedAaDroughtAdminView(AaDroughtDatasetModel))
    admin.add_view(UserEditView(User))
    admin.add_view(PermissionView(Permission))
    admin.add_view(UserPermissionView(UserPermission))
