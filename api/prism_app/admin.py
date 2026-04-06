"""Starlette Admin: read-only views for the alerts Postgres tables."""

from prism_app.database.alert_model import AlertModel
from prism_app.database.anticipatory_action_alerts_model import AnticipatoryActionAlerts
from prism_app.database.permission_model import Permission
from prism_app.database.prism_user_model import PrismUser
from prism_app.database.user_info_model import UserInfoModel
from starlette.requests import Request
from starlette_admin.contrib.sqla import Admin, ModelView


class ReadOnlyModelView(ModelView):
    """List and detail only; CUD is deferred until admin authentication exists."""

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


class PrismUserView(ReadOnlyModelView):
    """CIAM-mapped PRISM users (authorization identity; not legacy `user_info`)."""

    label = "PRISM users (CIAM)"


class PermissionView(ReadOnlyModelView):
    label = "Permissions"


def register_alerts_admin_views(admin: Admin) -> None:
    admin.add_view(AlertView(AlertModel))
    admin.add_view(UserInfoView(UserInfoModel))
    admin.add_view(AnticipatoryActionAlertsView(AnticipatoryActionAlerts))
    admin.add_view(PrismUserView(PrismUser))
    admin.add_view(PermissionView(Permission))
