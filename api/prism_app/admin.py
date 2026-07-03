"""Starlette Admin: read-only alerts; full CRUD for dashboards."""

from typing import Any

from prism_app.aa_drought.aa_drought_admin import (
    AaDroughtAdminView,
    register_aa_drought_admin_routes,
)
from prism_app.auth.admin_request import (
    apply_country_scope_filter,
    request_can_access_country,
    request_can_manage_aa_data,
    request_can_manage_dashboards,
    request_has_prism_admin_access,
)
from prism_app.admin_bulk_actions import bulk_status_select_form
from prism_app.auth.permission_codes import AA_DATA_MANAGE, DASHBOARD_MANAGE
from prism_app.auth.user_permission_grant import (
    existing_grant_countries,
    normalize_grant_country,
    user_permission_country_choices,
    validate_grant_country_conflicts,
    validate_grant_country_for_permission,
)
from prism_app.dashboard.dashboard_admin import DashboardAdminView
from prism_app.database.aa_drought_model import AaDroughtCountry, AaDroughtDatasetModel
from prism_app.database.alert_model import AlertModel
from prism_app.database.anticipatory_action_alerts_model import AnticipatoryActionAlerts
from prism_app.database.dashboard_model import DashboardCountry, DashboardModel, DashboardStatus
from prism_app.utils import utc_now
from prism_app.database.kobo_user_model import KoboUser
from prism_app.database.permission_model import Permission, UserPermission
from prism_app.database.user_model import User
from sqlalchemy import Select
from sqlalchemy.orm import Session
from starlette.requests import Request
from starlette_admin import EnumField, HasOne
from starlette_admin.actions import action
from starlette_admin.contrib.sqla import Admin, ModelView
from starlette_admin.exceptions import ActionFailed, FormValidationError


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


_COUNTRY_ACCESS_DENIED = (
    "You do not have permission to manage dashboards for this country."
)
_AA_COUNTRY_ACCESS_DENIED = (
    "You do not have permission to manage AA drought data for this country."
)
_DASHBOARD_BULK_UPDATE_STATUS_FORM = bulk_status_select_form(DashboardStatus)


def _dashboard_country_code(country: DashboardCountry | Any) -> str:
    if isinstance(country, DashboardCountry):
        return country.value
    return str(country)


def _aa_drought_country_code(country: AaDroughtCountry | Any) -> str:
    if isinstance(country, AaDroughtCountry):
        return country.value
    return str(country)


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

    def get_list_query(self, request: Request) -> Select:
        return apply_country_scope_filter(
            super().get_list_query(request),
            request,
            DASHBOARD_MANAGE,
            DashboardModel.country,
        )

    def get_count_query(self, request: Request) -> Select:
        return apply_country_scope_filter(
            super().get_count_query(request),
            request,
            DASHBOARD_MANAGE,
            DashboardModel.country,
        )

    def get_details_query(self, request: Request) -> Select:
        return apply_country_scope_filter(
            super().get_details_query(request),
            request,
            DASHBOARD_MANAGE,
            DashboardModel.country,
        )

    def _assert_obj_country_in_scope(self, request: Request, obj: DashboardModel) -> None:
        if not request_can_access_country(
            request,
            DASHBOARD_MANAGE,
            _dashboard_country_code(obj.country),
        ):
            raise FormValidationError({"config": _COUNTRY_ACCESS_DENIED})

    def _validate_bulk_dashboard_scope(
        self,
        request: Request,
        dashboards: list[Any],
        pks: list[Any],
    ) -> None:
        if len(dashboards) != len(pks):
            raise ActionFailed("One or more selected dashboards are not accessible")
        for dashboard in dashboards:
            if not request_can_access_country(
                request,
                DASHBOARD_MANAGE,
                _dashboard_country_code(dashboard.country),
            ):
                raise ActionFailed("One or more selected dashboards are not accessible")

    async def validate(self, request: Request, data: dict[str, Any]) -> None:
        await super().validate(request, data)
        country = data.get("country")
        if country is not None and not request_can_access_country(
            request,
            DASHBOARD_MANAGE,
            _dashboard_country_code(country),
        ):
            raise FormValidationError({"config": _COUNTRY_ACCESS_DENIED})

    async def before_create(
        self, request: Request, data: dict[str, Any], obj: Any
    ) -> None:
        await super().before_create(request, data, obj)
        self._assert_obj_country_in_scope(request, obj)

    async def before_edit(
        self, request: Request, data: dict[str, Any], obj: Any
    ) -> None:
        await super().before_edit(request, data, obj)
        self._assert_obj_country_in_scope(request, obj)

    @action(
        name="update_status",
        text="Update status",
        confirmation="Update the status of the selected dashboards?",
        submit_btn_text="Update status",
        submit_btn_class="btn-primary",
        icon_class="fa-solid fa-toggle-on",
        form=_DASHBOARD_BULK_UPDATE_STATUS_FORM,
    )
    async def update_status_action(self, request: Request, pks: list[Any]) -> str:
        data = await request.form()
        status_raw = data.get("status")
        if not status_raw:
            raise ActionFailed("Status is required")
        try:
            new_status = DashboardStatus(str(status_raw))
        except ValueError as exc:
            raise ActionFailed(f"Invalid status: {status_raw}") from exc

        dashboards = list(await self.find_by_pks(request, pks))
        self._validate_bulk_dashboard_scope(request, dashboards, pks)
        if not dashboards:
            raise ActionFailed("No accessible dashboards selected")

        session: Session = request.state.session
        now = utc_now()
        for dashboard in dashboards:
            dashboard.status = new_status
            dashboard.updated_at = now
            session.add(dashboard)
        session.commit()

        count = len(dashboards)
        label = new_status.value
        return f"Updated {count} dashboard{'s' if count != 1 else ''} to {label}."

    async def delete(self, request: Request, pks: list[Any]) -> int | None:
        dashboards = list(await self.find_by_pks(request, pks))
        self._validate_bulk_dashboard_scope(request, dashboards, pks)
        return await super().delete(request, pks)


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

    def get_list_query(self, request: Request) -> Select:
        return apply_country_scope_filter(
            super().get_list_query(request),
            request,
            AA_DATA_MANAGE,
            AaDroughtDatasetModel.country,
        )

    def get_count_query(self, request: Request) -> Select:
        return apply_country_scope_filter(
            super().get_count_query(request),
            request,
            AA_DATA_MANAGE,
            AaDroughtDatasetModel.country,
        )

    def get_details_query(self, request: Request) -> Select:
        return apply_country_scope_filter(
            super().get_details_query(request),
            request,
            AA_DATA_MANAGE,
            AaDroughtDatasetModel.country,
        )

    def _assert_obj_country_in_scope(
        self, request: Request, obj: AaDroughtDatasetModel
    ) -> None:
        if not request_can_access_country(
            request,
            AA_DATA_MANAGE,
            _aa_drought_country_code(obj.country),
        ):
            raise FormValidationError({"country": _AA_COUNTRY_ACCESS_DENIED})

    def _validate_bulk_aa_drought_scope(
        self,
        request: Request,
        datasets: list[Any],
        pks: list[Any],
    ) -> None:
        if len(datasets) != len(pks):
            raise ActionFailed("One or more selected datasets are not accessible")
        for dataset in datasets:
            if not request_can_access_country(
                request,
                AA_DATA_MANAGE,
                _aa_drought_country_code(dataset.country),
            ):
                raise ActionFailed("One or more selected datasets are not accessible")

    async def validate(self, request: Request, data: dict[str, Any]) -> None:
        country = data.get("country")
        if country is not None and not request_can_access_country(
            request,
            AA_DATA_MANAGE,
            _aa_drought_country_code(country),
        ):
            raise FormValidationError({"country": _AA_COUNTRY_ACCESS_DENIED})
        await super().validate(request, data)

    async def before_create(
        self, request: Request, data: dict[str, Any], obj: Any
    ) -> None:
        await super().before_create(request, data, obj)
        self._assert_obj_country_in_scope(request, obj)

    async def before_edit(
        self, request: Request, data: dict[str, Any], obj: Any
    ) -> None:
        await super().before_edit(request, data, obj)
        self._assert_obj_country_in_scope(request, obj)

    async def delete(self, request: Request, pks: list[Any]) -> int | None:
        datasets = list(await self.find_by_pks(request, pks))
        self._validate_bulk_aa_drought_scope(request, datasets, pks)
        return await super().delete(request, pks)


class UserPermissionView(PrismGatedModelView):
    """Grant or revoke capability codes (e.g. ``prism.admin.access``, ``prism.content.view``)."""

    label = "User permissions"
    fields = (
        HasOne("user", label="User", identity="user"),
        HasOne("permission", label="Permission", identity="permission"),
        EnumField(
            "country",
            label="Country",
            required=True,
            choices=user_permission_country_choices(),
            help_text=(
                "Use * for all countries (required for admin and other global permissions). "
                "For dashboard, map export, or AA drought managers, use * or a country below."
            ),
        ),
        "granted_at",
    )
    exclude_fields_from_create = ("granted_at",)  # auto-set to now() by DB default

    def can_edit(self, request: Request) -> bool:
        # Grants are immutable; revoke and create a new row to change scope.
        return False

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
        obj.country = normalize_grant_country(data.get("country"))
        return obj

    async def validate(self, request: Request, data: dict) -> None:
        errors: dict[str, str] = {}
        user = data.get("user")
        permission = data.get("permission")
        if user is None:
            errors["user"] = "Select a user."
        if permission is None:
            errors["permission"] = "Select a permission."

        country = normalize_grant_country(data.get("country"))
        data["country"] = country

        if permission is not None and "permission" not in errors:
            code_error = validate_grant_country_for_permission(permission.code, country)
            if code_error:
                errors["country"] = code_error

        if (
            user is not None
            and permission is not None
            and "user" not in errors
            and "permission" not in errors
            and "country" not in errors
        ):
            session: Session = request.state.session
            existing = existing_grant_countries(
                session,
                user_id=user.id,
                permission_id=permission.id,
            )
            conflict_error = validate_grant_country_conflicts(existing, country)
            if conflict_error:
                errors["country"] = conflict_error

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
