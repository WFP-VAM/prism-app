"""Pydantic model for map export schedule admin create/edit forms."""

from __future__ import annotations

from typing import Any

from prism_app.export_jobs.schedule_cron import validate_cron_expression
from prism_app.export_jobs.schedule_request import (
    map_export_request_from_schedule_export_urls,
    normalize_schedule_export_urls,
)
from pydantic import BaseModel, Field, ValidationError, field_validator


class MapExportScheduleAdminForm(BaseModel):
    """Normalize and validate Starlette Admin schedule form values."""

    name: str = Field(min_length=1)
    cron_expression: str
    max_runs: int = Field(ge=1)
    batch_map_url: str = Field(min_length=1)

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, value: Any) -> Any:
        if value is None:
            return ""
        return str(value).strip()

    @field_validator("cron_expression", mode="before")
    @classmethod
    def strip_cron_expression(cls, value: Any) -> Any:
        if value is None:
            return ""
        return str(value).strip()

    @field_validator("max_runs", mode="before")
    @classmethod
    def coerce_max_runs(cls, value: Any) -> Any:
        if value is None or value == "":
            return 0
        if isinstance(value, str):
            text = value.strip()
            return int(text) if text else 0
        return value

    @field_validator("batch_map_url", mode="before")
    @classmethod
    def strip_batch_map_url(cls, value: Any) -> Any:
        if value is None:
            return ""
        return str(value).strip()

    @field_validator("cron_expression")
    @classmethod
    def validate_cron(cls, value: str) -> str:
        return validate_cron_expression(value)

    @field_validator("batch_map_url")
    @classmethod
    def validate_batch_map_url(cls, value: str) -> str:
        map_export_request_from_schedule_export_urls(value)
        return normalize_schedule_export_urls(value)


def map_export_schedule_admin_form_errors(exc: ValidationError) -> dict[str, str]:
    """Map Pydantic errors to Starlette Admin field keys."""
    errors: dict[str, str] = {}
    for err in exc.errors():
        loc = tuple(str(part) for part in err["loc"])
        if loc:
            key = loc[0]
        else:
            key = "batch_map_url"
        errors[key] = err["msg"]
    return errors


def apply_map_export_schedule_admin_form(data: dict[str, Any]) -> None:
    """Validate admin form input and write normalized values back to ``data``."""
    form = MapExportScheduleAdminForm.model_validate(
        {
            "name": data.get("name"),
            "cron_expression": data.get("cron_expression"),
            "max_runs": data.get("max_runs"),
            "batch_map_url": data.get("batch_map_url"),
        }
    )
    data["name"] = form.name
    data["cron_expression"] = form.cron_expression
    data["max_runs"] = form.max_runs
    data["batch_map_url"] = form.batch_map_url
