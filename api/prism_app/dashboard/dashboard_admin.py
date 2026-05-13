"""Starlette Admin: full CRUD for dashboard configs (JSONB + lifecycle)."""

import json
from typing import Any, cast

from prism_app.dashboard.dashboard_config_field import DashboardConfigJsonFileField
from prism_app.database.dashboard_model import (
    ALLOWED_DASHBOARD_DEPLOYMENTS,
    DashboardStatus,
)
from sqlalchemy.exc import IntegrityError
from starlette.requests import Request
from starlette_admin.contrib.sqla import ModelView
from starlette_admin.exceptions import FormValidationError
from starlette_admin.fields import EnumField


class DashboardAdminView(ModelView):
    """Create / edit / delete dashboards; path is derived from title and deployment.

    The `config` JSONB field is uploaded as a JSON file (drag-and-drop or browse).
    Upload a single dashboard row object (not an array).
    """

    label = "Dashboards"
    name = "dashboard"
    detail_template = "detail_dashboard.html"
    fields = [
        "title",
        EnumField(
            "deployment",
            label="Country",
            required=True,
            choices=[(value, value) for value in ALLOWED_DASHBOARD_DEPLOYMENTS],
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
    )
    exclude_fields_from_edit = (
        "id",
        "created_at",
        "updated_at",
    )
    searchable_fields = [
        "title",
        "status",
        "deployment",
    ]

    async def validate(self, request: Request, data: dict[str, Any]) -> None:
        errors: dict[str, str] = {}

        title = data.get("title")
        if title is None or not str(title).strip():
            errors["title"] = "Title is required."
        else:
            data["title"] = str(title).strip()

        deployment = data.get("deployment")
        if deployment is None or not str(deployment).strip():
            errors["deployment"] = "Country is required."
        else:
            deployment_val = str(deployment).strip()
            if deployment_val not in ALLOWED_DASHBOARD_DEPLOYMENTS:
                errors["deployment"] = (
                    "Deployment must match a frontend config key "
                    "(frontend/src/config/index.ts::configMap)."
                )
            else:
                data["deployment"] = deployment_val

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

        if errors:
            raise FormValidationError(cast(dict[str | int, Any], errors))

    def handle_exception(self, exc: Exception) -> None:
        """Convert IntegrityError from duplicate title/deployment into user-friendly form error."""
        if isinstance(exc, IntegrityError):
            error_msg = str(exc.orig) if hasattr(exc, "orig") else str(exc)
            if "uq_dashboard_deployment_title" in error_msg or "uq_dashboard_deployment_path" in error_msg:
                raise FormValidationError(
                    cast(
                        dict[str | int, Any],
                        {
                            "title": "A dashboard with this title already exists for the selected country."
                        },
                    )
                )
        return super().handle_exception(exc)
