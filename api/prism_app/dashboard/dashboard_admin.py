"""Starlette Admin: full CRUD for dashboard configs (JSONB + lifecycle)."""

import json
from typing import Any, cast

from prism_app.dashboard.dashboard_config_field import DashboardConfigJsonFileField
from prism_app.database.dashboard_model import DashboardCountry, DashboardStatus
from starlette.requests import Request
from starlette_admin.contrib.sqla import ModelView
from starlette_admin.exceptions import FormValidationError
from starlette_admin.fields import EnumField

_DASHBOARD_COUNTRY_CHOICES = [
    (country.value, country.value) for country in DashboardCountry
]


class DashboardAdminView(ModelView):
    """Create / edit / delete dashboards; path is derived from title and country.

    The `config` JSONB field is uploaded as a JSON file (drag-and-drop or browse).
    Use the same top-level array as ``dashboard.json`` (one or more dashboard rows), or
    a single row object.
    """

    label = "Dashboards"
    name = "dashboard"
    detail_template = "detail_dashboard.html"
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
                "Upload a dashboard JSON file (same shape as dashboard.json: "
                "an array of dashboard rows, or a single row object)."
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
    )
    exclude_fields_from_edit = (
        "id",
        "created_at",
        "updated_at",
    )
    searchable_fields = [
        "title",
        "status",
        "country",
    ]

    async def validate(self, request: Request, data: dict[str, Any]) -> None:
        errors: dict[str, str] = {}

        title = data.get("title")
        if title is None or not str(title).strip():
            errors["title"] = "Title is required."
        else:
            data["title"] = str(title).strip()

        country = data.get("country")
        if country is None or not str(country).strip():
            errors["country"] = "Country is required."
        else:
            country_val = str(country).strip()
            try:
                data["country"] = DashboardCountry(country_val)
            except ValueError:
                errors["country"] = (
                    "Country must match a frontend config key "
                    "(frontend/src/config/index.ts::configMap)."
                )

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
            else:
                data["config"] = cfg

        if errors:
            raise FormValidationError(cast(dict[str | int, Any], errors))
