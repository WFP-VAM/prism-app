"""HTTP route for creating scheduled batch map exports."""

from __future__ import annotations

from typing import Annotated, Any, Literal
from uuid import UUID

from fastapi import APIRouter, Depends
from prism_app.auth.deps import require_any_permission
from prism_app.auth.permission_codes import ADMIN_ACCESS, MAP_EXPORTS_MANAGE
from prism_app.database.map_export_schedule_model import (
    MapExportSchedule,
    MapExportScheduleCadence,
)
from prism_app.database.user_model import User
from prism_app.export_jobs.db import get_export_jobs_session
from prism_app.export_schedule_validation import validate_schedule_export_url
from prism_app.models import ExportFormat
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlmodel import Session

router = APIRouter(prefix="/export-map", tags=["export-map"])

_ScheduleCreateSession = Annotated[
    tuple[User, set[str]],
    Depends(require_any_permission(MAP_EXPORTS_MANAGE, ADMIN_ACCESS)),
]


class MapExportScheduleCreateRequest(BaseModel):
    """Schedule metadata plus client-built export URL and opaque template JSON."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., min_length=1)
    country: str = Field(..., min_length=1)
    layer_id: str = Field(..., min_length=1)
    cadence: MapExportScheduleCadence
    dekad_interval: int = Field(default=1, ge=1)
    format: ExportFormat = "pdf"
    export_url: str = Field(..., min_length=1)
    export_options: dict[str, Any] = Field(default_factory=dict)
    admin_areas: str = ""

    @model_validator(mode="after")
    def validate_export_url_contract(self) -> MapExportScheduleCreateRequest:
        self.export_url = validate_schedule_export_url(
            self.export_url,
            self.layer_id,
        )
        return self


class MapExportScheduleCreateResponse(BaseModel):
    schedule_id: UUID
    status: Literal["active"]
    name: str
    export_url: str


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

    schedule = MapExportSchedule(
        name=body.name.strip(),
        country=body.country,
        layer_id=body.layer_id,
        cadence=body.cadence,
        dekad_interval=body.dekad_interval,
        export_url=body.export_url,
        format=body.format,
        export_options=body.export_options,
        admin_areas=body.admin_areas,
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
