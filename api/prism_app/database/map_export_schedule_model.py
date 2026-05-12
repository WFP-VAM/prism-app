"""ORM for recurring map export schedules (cron in UTC)."""

from __future__ import annotations

import datetime
import uuid
from typing import Optional

from prism_app.utils import utc_now
from sqlalchemy import Column, DateTime, Index, Integer, String, Text
from sqlmodel import Field, SQLModel


class MapExportSchedule(SQLModel, table=True):
    __tablename__ = "map_export_schedules"
    __table_args__ = (
        Index(
            "ix_map_export_schedules_next_run_at",
            "next_run_at",
        ),
    )

    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        sa_column=Column(String, primary_key=True),
    )
    name: str = Field(sa_column=Column(String, nullable=False))
    cron_expression: str = Field(sa_column=Column(String, nullable=False))
    batch_map_url: str = Field(sa_column=Column(Text, nullable=False))
    max_runs: int = Field(sa_column=Column(Integer, nullable=False))
    runs_completed: int = Field(
        default=0,
        sa_column=Column(Integer, nullable=False, server_default="0"),
    )
    next_run_at: Optional[datetime.datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    last_run_at: Optional[datetime.datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    created_at: datetime.datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    updated_at: datetime.datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )

    @property
    def is_active(self) -> bool:
        return self.runs_completed < self.max_runs and self.next_run_at is not None
