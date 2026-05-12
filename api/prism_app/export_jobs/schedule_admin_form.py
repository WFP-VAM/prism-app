"""Pydantic model for map export schedule admin create/edit forms."""

from __future__ import annotations

import json
from typing import Any

from prism_app.export_jobs.schedule_cron import validate_cron_expression
from prism_app.models import MapExportRequestModel
from pydantic import BaseModel, Field, ValidationError, field_validator


class MapExportScheduleAdminForm(BaseModel):
    """Normalize and validate Starlette Admin schedule form values."""

    name: str = Field(min_length=1)
    cron_expression: str
    max_runs: int = Field(ge=1)
    request_payload_json: MapExportRequestModel

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

    @field_validator("request_payload_json", mode="before")
    @classmethod
    def parse_request_payload_json(cls, value: Any) -> Any:
        if isinstance(value, str):
            text = value.strip()
            if not text:
                return {}
            try:
                return json.loads(text)
            except json.JSONDecodeError as exc:
                raise ValueError(
                    f"Invalid JSON in request_payload_json: {exc}"
                ) from exc
        return value or {}

    @field_validator("cron_expression")
    @classmethod
    def validate_cron(cls, value: str) -> str:
        return validate_cron_expression(value)


def map_export_schedule_admin_form_errors(exc: ValidationError) -> dict[str, str]:
    """Map Pydantic errors to Starlette Admin field keys."""
    errors: dict[str, str] = {}
    for err in exc.errors():
        loc = tuple(str(part) for part in err["loc"])
        if loc and loc[0] == "request_payload_json" and len(loc) > 1:
            key = "request_payload_json." + ".".join(loc[1:])
        elif loc:
            key = loc[0]
        else:
            key = "request_payload_json"
        errors[key] = err["msg"]
    return errors


def apply_map_export_schedule_admin_form(data: dict[str, Any]) -> None:
    """Validate admin form input and write normalized values back to ``data``."""
    form = MapExportScheduleAdminForm.model_validate(
        {
            "name": data.get("name"),
            "cron_expression": data.get("cron_expression"),
            "max_runs": data.get("max_runs"),
            "request_payload_json": data.get("request_payload_json"),
        }
    )
    data["name"] = form.name
    data["cron_expression"] = form.cron_expression
    data["max_runs"] = form.max_runs
    data["request_payload_json"] = form.request_payload_json.model_dump(mode="json")
