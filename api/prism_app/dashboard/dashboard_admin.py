"""Starlette Admin: full CRUD for dashboard configs (JSONB + lifecycle)."""

import json
from typing import Any, cast

from prism_app.dashboard.dashboard_config_field import DashboardConfigJsonFileField
from prism_app.database.dashboard_model import DashboardCountry, DashboardStatus
from sqlalchemy.exc import IntegrityError
from starlette.requests import Request
from starlette_admin.contrib.sqla import ModelView
from starlette_admin.exceptions import FormValidationError
from starlette_admin.fields import EnumField

_DASHBOARD_COUNTRY_CHOICES = [
    (country.value, country.value) for country in DashboardCountry
]

_DUPLICATE_DASHBOARD_FALLBACK_MSG = (
    "A dashboard with this title already exists for the selected country. "
    "Change the title in your config JSON or edit the existing dashboard."
)


class DashboardAdminView(ModelView):
    """Create / edit / delete dashboards; path is derived from title and country.

    Title and country are read-only in the admin form and derived from the uploaded
    config JSON. Status is the only editable lifecycle field besides the config file.

    The `config` JSONB field is uploaded as a JSON file (drag-and-drop or browse).
    Upload a single dashboard row object (not an array).
    """

    label = "Dashboards"
    name = "dashboard"
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

    async def validate(self, request: Request, data: dict[str, Any]) -> None:
        errors: dict[str, str] = {}

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
                if not title:
                    errors["config"] = (
                        "Config JSON must include a non-empty 'title' field."
                    )
                else:
                    data["title"] = title

                country_val = str(cfg.get("country", "")).strip()
                if not country_val:
                    errors["config"] = (
                        errors.get("config")
                        or "Config JSON must include a 'country' field matching a valid country code."
                    )
                else:
                    try:
                        data["country"] = DashboardCountry(country_val)
                    except ValueError:
                        errors["config"] = (
                            f"Config 'country' value '{country_val}' is not a valid country code."
                        )

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
