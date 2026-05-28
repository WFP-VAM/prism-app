"""HTTP route for creating scheduled batch map exports."""

from __future__ import annotations

import json
from typing import Annotated, Any, Literal
from urllib.parse import urlencode, urlparse, urlunparse

from fastapi import APIRouter, Depends, HTTPException
from prism_app.auth.deps import require_any_permission
from prism_app.auth.permission_codes import ADMIN_ACCESS, MAP_EXPORTS_MANAGE
from prism_app.database.map_export_schedule_model import (
    MapExportSchedule,
    MapExportScheduleCadence,
)
from prism_app.database.user_model import User
from prism_app.export_jobs.db import get_export_jobs_session
from prism_app.models import ExportFormat
from prism_app.utils import validate_export_url
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlmodel import Session

router = APIRouter(prefix="/export-map", tags=["export-map"])

_ScheduleCreateSession = Annotated[
    tuple[User, set[str]],
    Depends(require_any_permission(MAP_EXPORTS_MANAGE, ADMIN_ACCESS)),
]


class ScheduleExportQueryParams(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    bounds: str = Field(..., min_length=1)
    zoom: str | int | float | None = None
    map_width: int | None = Field(default=None, alias="mapWidth")
    map_height: int | None = Field(default=None, alias="mapHeight")
    aspect_ratio: str | None = Field(default=None, alias="aspectRatio")
    custom_width: int | float | None = Field(default=None, alias="customWidth")
    custom_height: int | float | None = Field(default=None, alias="customHeight")
    title: str | None = None
    footer: str | None = None
    footer_text_size: int | None = Field(default=None, alias="footerTextSize")
    logo_position: int | None = Field(default=None, alias="logoPosition")
    logo_scale: int | float | None = Field(default=None, alias="logoScale")
    legend_position: int | None = Field(default=None, alias="legendPosition")
    legend_scale: int | float | None = Field(default=None, alias="legendScale")
    bottom_logo_scale: int | float | None = Field(
        default=None,
        alias="bottomLogoScale",
    )
    toggles: dict[str, bool] | None = None
    selected_boundaries: list[str] | str | None = Field(
        default=None,
        alias="selectedBoundaries",
    )
    language: str | None = None


class ScheduleExportOptions(BaseModel):
    model_config = ConfigDict(extra="allow", populate_by_name=True)

    origin: str = Field(..., min_length=1)
    export_path: str = Field(default="/export", alias="exportPath")
    query_params: ScheduleExportQueryParams = Field(alias="queryParams")
    viewport_width: int | None = Field(default=None, alias="viewportWidth")
    viewport_height: int | None = Field(default=None, alias="viewportHeight")

    @field_validator("origin")
    @classmethod
    def validate_origin(cls, value: str) -> str:
        parsed = urlparse(value)
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            raise ValueError("origin must be an absolute http(s) origin")
        return value.rstrip("/")

    @field_validator("export_path")
    @classmethod
    def validate_export_path(cls, value: str) -> str:
        if not value.startswith("/"):
            raise ValueError("exportPath must start with '/'")
        return value


class MapExportScheduleCreateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(..., min_length=1)
    country: str = Field(..., min_length=1)
    layer_id: str = Field(..., min_length=1)
    cadence: MapExportScheduleCadence
    dekad_interval: int = Field(default=1, ge=1)
    format: ExportFormat = "pdf"
    export_options: ScheduleExportOptions = Field(alias="export_options")


class MapExportScheduleCreateResponse(BaseModel):
    schedule_id: str
    status: Literal["active"]
    name: str
    export_url: str


def _query_value(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, list):
        return ",".join(str(item) for item in value)
    if isinstance(value, dict):
        return json.dumps(value, separators=(",", ":"))
    return str(value)


def build_schedule_export_url(body: MapExportScheduleCreateRequest) -> str:
    options = body.export_options
    parsed_origin = urlparse(options.origin)
    params = {
        key: _query_value(value)
        for key, value in options.query_params.model_dump(
            mode="json",
            by_alias=True,
            exclude_none=True,
        ).items()
        if value is not None
    }
    params.pop("baselineLayerId", None)
    params["date"] = "{date}"
    params["hazardLayerIds"] = "{layer_id}"

    export_url = urlunparse(
        (
            parsed_origin.scheme,
            parsed_origin.netloc,
            options.export_path,
            "",
            urlencode(params, safe="{},:"),
            "",
        )
    )

    sample_url = export_url.replace("{date}", "2000-01-01").replace(
        "{layer_id}",
        body.layer_id,
    )
    validate_export_url(sample_url)
    return export_url


def format_map_export_schedule_name(
    *,
    country: str,
    layer_id: str,
    cadence: MapExportScheduleCadence,
    format: str,
) -> str:
    return f"{country} {layer_id} {cadence.value} {format.upper()}"


@router.post(
    "/schedules",
    status_code=201,
    response_model=MapExportScheduleCreateResponse,
)
def create_map_export_schedule(
    body: MapExportScheduleCreateRequest,
    prism: _ScheduleCreateSession,
    session: Session = Depends(get_export_jobs_session),
) -> MapExportScheduleCreateResponse:
    user, _codes = prism
    if user.id is None:
        raise HTTPException(status_code=500, detail="Authenticated user is missing id")

    schedule = MapExportSchedule(
        name=body.name.strip(),
        country=body.country,
        layer_id=body.layer_id,
        cadence=body.cadence,
        dekad_interval=body.dekad_interval,
        export_url=build_schedule_export_url(body),
        format=body.format,
        export_options=body.export_options.model_dump(
            mode="json",
            by_alias=True,
            exclude_none=True,
        ),
        created_by_user_id=user.id,
    )
    session.add(schedule)
    session.commit()
    session.refresh(schedule)

    return MapExportScheduleCreateResponse(
        schedule_id=schedule.id,
        status="active",
        name=schedule.name,
        export_url=schedule.export_url,
    )
