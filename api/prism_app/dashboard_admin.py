"""Starlette Admin: full CRUD for dashboard configs (JSONB + lifecycle)."""

import json
from typing import Any, cast

from starlette.requests import Request
from starlette_admin.contrib.sqla import ModelView
from starlette_admin.exceptions import FormValidationError

from prism_app.dashboard_config_validation import validate_and_dump_dashboard_config
from prism_app.dashboard_slug import slugify_dashboard_name
from prism_app.database.dashboard_model import (
    ALLOWED_DASHBOARD_DEPLOYMENTS,
    DashboardModel,
)


class DashboardAdminView(ModelView):
    """Create / edit / delete dashboards; `slug` is derived from `title`.

    The `config` JSONB field uses Starlette Admin's built-in JSON editor (tree/code).
    Paste the same top-level array as ``dashboard.json`` (one or more dashboard rows), or
    a single row object.
    """

    label = "Dashboards"
    exclude_fields_from_list = ("config",)
    exclude_fields_from_create = (
        "id",
        "slug",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
    )
    exclude_fields_from_edit = (
        "id",
        "slug",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
    )
    searchable_fields = [
        "title",
        "slug",
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
        if deployment is not None and str(deployment).strip():
            deployment_val = str(deployment).strip()
            if deployment_val not in ALLOWED_DASHBOARD_DEPLOYMENTS:
                errors["deployment"] = (
                    "Deployment must match a frontend config key "
                    "(frontend/src/config/index.ts::configMap)."
                )
            else:
                data["deployment"] = deployment_val
        elif deployment is not None:
            data["deployment"] = None

        cfg = data.get("config")
        if isinstance(cfg, str):
            try:
                cfg = json.loads(cfg)
            except json.JSONDecodeError as e:
                errors["config"] = f"Invalid JSON: {e}"
                cfg = None
        if "config" not in errors:
            if cfg is None:
                errors["config"] = "Dashboard configuration is required."
            else:
                try:
                    data["config"] = validate_and_dump_dashboard_config(cfg)
                except ValueError as e:
                    errors["config"] = str(e)

        if errors:
            raise FormValidationError(cast(dict[str | int, Any], errors))

    async def before_create(
        self, request: Request, data: dict[str, Any], obj: Any
    ) -> None:
        assert isinstance(obj, DashboardModel)
        obj.slug = slugify_dashboard_name(obj.title)

    async def before_edit(
        self, request: Request, data: dict[str, Any], obj: Any
    ) -> None:
        assert isinstance(obj, DashboardModel)
        obj.slug = slugify_dashboard_name(obj.title)
