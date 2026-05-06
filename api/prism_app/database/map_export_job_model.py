"""ORM for async map_export_jobs table."""

from __future__ import annotations

import datetime
import uuid
from typing import Any, Optional

from sqlalchemy import JSON, Column, DateTime, Index, String
from sqlmodel import Field, SQLModel


def _utc_now() -> datetime.datetime:
    return datetime.datetime.now(datetime.UTC)


class MapExportJob(SQLModel, table=True):
    __tablename__ = "map_export_jobs"
    __table_args__ = (
        Index(
            "ix_map_export_jobs_principal_fingerprint",
            "requested_by",
            "request_fingerprint",
        ),
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
    requested_by: str = Field(sa_column=Column(String, nullable=False))
    created_at: datetime.datetime = Field(
        default_factory=_utc_now,
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
        default_factory=_utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    progress_current: Optional[int] = Field(default=None)
    progress_total: Optional[int] = Field(default=None)
