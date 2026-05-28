"""ORM for async map_export_jobs table."""

from __future__ import annotations

import datetime
import uuid
from typing import Any, Optional
from uuid import UUID

from prism_app.database import map_export_schedule_model as _map_export_schedule_model
from prism_app.database import user_model as _user_model
from prism_app.utils import utc_now
from sqlalchemy import JSON, Column, DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.types import Uuid
from sqlmodel import Field, SQLModel

_ = (_map_export_schedule_model, _user_model)


class MapExportJob(SQLModel, table=True):
    __tablename__ = "map_export_jobs"
    __table_args__ = (
        Index(
            "ix_map_export_jobs_request_fingerprint",
            "request_fingerprint",
        ),
        Index(
            "ix_map_export_jobs_status_priority_created",
            "status",
            "priority",
            "created_at",
        ),
        Index(
            "ix_map_export_jobs_schedule_created",
            "map_export_schedule_id",
            "created_at",
        ),
        Index("ix_map_export_jobs_created_by_user_id", "created_by_user_id"),
    )

    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        sa_column=Column(String, primary_key=True),
    )
    request_fingerprint: str = Field(sa_column=Column(String, nullable=False))
    request_payload_json: dict[str, Any] = Field(
        sa_column=Column(JSON, nullable=False),
    )
    status: str = Field(sa_column=Column(String, nullable=False))
    error_json: Optional[dict[str, Any]] = Field(
        default=None,
        sa_column=Column(JSON, nullable=True),
    )
    s3_uri: Optional[str] = Field(default=None, sa_column=Column(String, nullable=True))
    content_type: Optional[str] = Field(
        default=None,
        sa_column=Column(String, nullable=True),
    )
    map_export_schedule_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            Uuid(as_uuid=True),
            ForeignKey("map_export_schedules.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    created_by_user_id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            Uuid(as_uuid=True),
            ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    origin_url: Optional[str] = Field(
        default=None,
        sa_column=Column(String(2048), nullable=True),
    )
    created_at: datetime.datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    started_at: Optional[datetime.datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    finished_at: Optional[datetime.datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    updated_at: datetime.datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    progress_current: Optional[int] = Field(default=None)
    progress_total: Optional[int] = Field(default=None)
    priority: int = Field(
        default=200,
        sa_column=Column(Integer, nullable=False, server_default="200"),
    )

    def __admin_repr__(self, request) -> str:  # noqa: ARG002
        schedule = (
            str(self.map_export_schedule_id)
            if self.map_export_schedule_id is not None
            else "interactive"
        )
        return f"{self.status} — {schedule}"
