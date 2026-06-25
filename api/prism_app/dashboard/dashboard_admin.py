"""Starlette Admin: full CRUD for dashboard configs (JSONB + lifecycle)."""

import json
from typing import Any, cast

from prism_app.admin_bulk_actions import bulk_status_select_form
from prism_app.dashboard.dashboard_config_field import DashboardConfigJsonFileField
from prism_app.database.dashboard_model import DashboardCountry, DashboardStatus
from prism_app.utils import utc_now
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from starlette.requests import Request
from starlette_admin.actions import action
from starlette_admin.contrib.sqla import ModelView
from starlette_admin.exceptions import ActionFailed, FormValidationError
from starlette_admin.fields import EnumField
from starlette_admin.i18n import ngettext

_DASHBOARD_COUNTRY_CHOICES = [
    (country.value, country.value) for country in DashboardCountry
]

_DUPLICATE_DASHBOARD_FALLBACK_MSG = (
    "A dashboard with this title already exists for the selected country. "
    "Change the title in your config JSON or edit the existing dashboard."
)

_DASHBOARD_BULK_UPDATE_STATUS_FORM = bulk_status_select_form(DashboardStatus)


class DashboardAdminView(ModelView):
    """Create / edit / delete dashboards; path is derived from title and country.

    Title and country are read-only in the admin form and derived from the uploaded
    config JSON. Status is the only editable lifecycle field besides the config file.

    The `config` JSONB field is uploaded as a JSON file (drag-and-drop or browse).
    Upload a single dashboard row object (not an array).
    """

    label = "Dashboards"
    name = "dashboard"
    list_template = "dashboard_list.html"
    detail_template = "detail_dashboard.html"
    edit_template = "edit_no_add_another.html"
    create_template = "create_no_add_another.html"
    fields = [
        "title",
        EnumField(
            "country",
            label="Country",
            required=True,
            choices=_DASHBOARD_COUNTRY_CHOICES,
        ),
        EnumField(
            "status",
            label="Status",
            required=True,
            choices=[(status.value, status.value) for status in DashboardStatus],
        ),
        DashboardConfigJsonFileField(
            "config",
            label="Configuration file",
            required=True,
            help_text=(
                "Upload a dashboard JSON file containing a single "
                "dashboard row object (not an array)."
            ),
        ),
        "created_at",
        "updated_at",
    ]
    exclude_fields_from_list = ("config",)
    exclude_fields_from_create = (
        "id",
        "created_at",
        "updated_at",
        "title",
        "country",
    )
    exclude_fields_from_edit = (
        "id",
        "created_at",
        "updated_at",
        "title",
        "country",
    )
    searchable_fields = [
        "title",
        "status",
        "country",
    ]
    actions = ["update_status", "delete"]

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

        session: Session = request.state.session
        dashboards = list(await self.find_by_pks(request, pks))
        if not dashboards:
            raise ActionFailed("No accessible dashboards selected")

        now = utc_now()
        for dashboard in dashboards:
            dashboard.status = new_status
            dashboard.updated_at = now
            session.add(dashboard)
        session.commit()

        count = len(dashboards)
        label = new_status.value
        return f"Updated {count} dashboard{'s' if count != 1 else ''} to {label}."

    @action(
        name="delete",
        text="Delete dashboards",
        confirmation=(
            "Are you sure you want to delete the selected dashboards? "
            "This cannot be undone."
        ),
        submit_btn_text="Yes, delete",
        submit_btn_class="btn-danger",
        icon_class="fa-solid fa-trash",
    )
    async def delete_action(self, request: Request, pks: list[Any]) -> str:
        affected_rows = await self.delete(request, pks)
        return ngettext(
            "Dashboard was successfully deleted",
            "%(count)d dashboards were successfully deleted",
            affected_rows or 0,
        ) % {"count": affected_rows}

    async def validate(self, request: Request, data: dict[str, Any]) -> None:
        errors: dict[str, str] = {}

        status_val = data.get("status")
        if not status_val:
            errors["status"] = "Status is required."
        else:
            try:
                data["status"] = DashboardStatus(status_val)
            except ValueError:
                errors["status"] = f"Invalid status value '{status_val}'."

        cfg = data.get("config")
        if isinstance(cfg, str):
            try:
                cfg = json.loads(cfg)
            except json.JSONDecodeError as e:
                errors["config"] = f"Invalid JSON: {e}"
                cfg = None
        if "config" not in errors:
            if cfg is None:
                errors["config"] = "Upload a valid JSON configuration file."
            elif isinstance(cfg, list):
                errors["config"] = (
                    "Expected a single dashboard row object, not an array. "
                    "Please upload a JSON file containing one {...} object."
                )
            elif not isinstance(cfg, dict):
                errors["config"] = "Config must be a JSON object."
            else:
                data["config"] = cfg

                title = str(cfg.get("title", "")).strip()
                country_val = str(cfg.get("country", "")).strip()
                config_errors: list[str] = []

                if not title:
                    config_errors.append(
                        "Config JSON must include a non-empty 'title' field."
                    )

                country: DashboardCountry | None = None
                if not country_val:
                    config_errors.append(
                        "Config JSON must include a 'country' field matching a valid country code."
                    )
                else:
                    try:
                        country = DashboardCountry(country_val)
                    except ValueError:
                        config_errors.append(
                            f"Config 'country' value '{country_val}' is not a valid country code."
                        )

                if config_errors:
                    errors["config"] = "; ".join(config_errors)
                else:
                    data["title"] = title
                    data["country"] = country

        if errors:
            raise FormValidationError(cast(dict[str | int, Any], errors))

    def _apply_title_and_country_from_config(self, obj: Any) -> None:
        """Set title and country on the ORM instance from its config JSON.

        Called from before_create/before_edit because excluded fields are not
        populated from form data by starlette-admin's internal create/edit flow.
        """
        cfg = obj.config
        if not isinstance(cfg, dict):
            return
        title = str(cfg.get("title", "")).strip()
        if title:
            obj.title = title
        country_val = str(cfg.get("country", "")).strip()
        if country_val:
            try:
                obj.country = DashboardCountry(country_val)
            except ValueError:
                pass

    async def before_create(
        self, request: Request, data: dict[str, Any], obj: Any
    ) -> None:
        self._apply_title_and_country_from_config(obj)

    async def before_edit(
        self, request: Request, data: dict[str, Any], obj: Any
    ) -> None:
        self._apply_title_and_country_from_config(obj)

    def handle_exception(self, exc: Exception) -> None:
        """Convert IntegrityError from duplicate title/country into user-friendly form error."""
        if isinstance(exc, IntegrityError):
            error_msg = str(exc.orig) if hasattr(exc, "orig") else str(exc)
            if (
                "uq_dashboard_country_title" in error_msg
                or "uq_dashboard_country_path" in error_msg
            ):
                raise FormValidationError(
                    cast(
                        dict[str | int, Any],
                        {"config": _DUPLICATE_DASHBOARD_FALLBACK_MSG},
                    )
                )
        return super().handle_exception(exc)
