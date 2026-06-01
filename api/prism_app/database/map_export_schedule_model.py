"""ORM for scheduled batch map exports."""

from __future__ import annotations

import datetime
import uuid
from enum import Enum
from typing import Any, Optional, Self
from uuid import UUID

from prism_app.export_schedule_validation import normalize_schedule_export_url
from prism_app.utils import utc_now
from pydantic import model_validator
from sqlalchemy import JSON, Column, Date, DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.types import Uuid
from sqlmodel import Field, SQLModel


class MapExportScheduleStatus(str, Enum):
    """Schedule lifecycle: active rows are enqueued by cron; stopped rows are not."""

    active = "active"
    stopped = "stopped"


# Note: these cadence options come from existing frontend logic
class MapExportScheduleCadence(str, Enum):
    every_n_dekads = "every_n_dekads"
    monthly = "monthly"
    quarterly = "quarterly"


class MapExportScheduleFormat(str, Enum):
    pdf = "pdf"
    png = "png"


MAX_DEKAD_INTERVAL = 3


class MapExportSchedule(SQLModel, table=True):
    __tablename__ = "map_export_schedules"
    __table_args__ = (
        Index(
            "ix_map_export_schedules_status_country_layer",
            "status",
            "country",
            "layer_id",
        ),
        Index("ix_map_export_schedules_created_by_user_id", "created_by_user_id"),
    )

    id: UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(PG_UUID(as_uuid=True), primary_key=True, nullable=False),
    )
    name: str = Field(sa_column=Column(String, nullable=False))
    status: MapExportScheduleStatus = Field(
        default=MapExportScheduleStatus.active,
        sa_column=Column(String, nullable=False, server_default="active"),
    )
    country: str = Field(sa_column=Column(String, nullable=False))
    layer_id: str = Field(sa_column=Column(String, nullable=False))
    # Comma-separated admin codes at schedule creation; display-only in admin for now.
    admin_areas: str = Field(
        default="",
        sa_column=Column(String, nullable=False, server_default=""),
    )
    cadence: MapExportScheduleCadence = Field(sa_column=Column(String, nullable=False))
    dekad_interval: int = Field(
        default=1,
        sa_column=Column(Integer, nullable=False, server_default="1"),
    )
    export_url: str = Field(sa_column=Column(String(4096), nullable=False))
    format: MapExportScheduleFormat = Field(
        sa_column=Column(String, nullable=False),
    )
    export_options: dict[str, Any] = Field(sa_column=Column(JSON, nullable=False))
    last_checked_at: Optional[datetime.datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    # Audit timestamp: when system last enqueued work for this schedule.
    last_enqueued_at: Optional[datetime.datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    # Schedule state: latest layer data date enqueued, used to avoid duplicates.
    last_enqueued_date: Optional[datetime.date] = Field(
        default=None,
        sa_column=Column(Date, nullable=True),
    )
    created_by_user_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            Uuid(as_uuid=True),
            ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    created_at: datetime.datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    updated_at: datetime.datetime = Field(
        default_factory=utc_now,
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
            onupdate=utc_now,
        ),
    )

    def __admin_repr__(self, request) -> str:  # noqa: ARG002
        # SQLAlchemy may hydrate status as a plain str, not the enum member.
        status_label = (
            self.status.value
            if isinstance(self.status, MapExportScheduleStatus)
            else self.status
        )
        return f"{self.name} ({status_label})"

    @model_validator(mode="after")
    def validate_export_url_placeholders(self) -> Self:
        normalized = normalize_schedule_export_url(self.export_url)
        missing = [
            placeholder
            for placeholder in ("{date}", "{layer_id}")
            if placeholder not in normalized
        ]
        if missing:
            raise ValueError(f"export_url missing placeholders: {', '.join(missing)}")
        if normalized != self.export_url:
            # Avoid SQLAlchemy attribute set during Pydantic validation (no _sa_instance_state yet).
            object.__setattr__(self, "export_url", normalized)
        return self
