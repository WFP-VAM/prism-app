"""Dashboard configuration persisted in Postgres (JSONB + lifecycle)."""

import datetime
import uuid
from enum import Enum
from typing import Any

from sqlalchemy import Column, DateTime, Index, String, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlmodel import Field, SQLModel


class DashboardStatus(str, Enum):
    """Publication state: drafts are not served to the PRISM UI read API."""

    draft = "draft"
    published = "published"


_dashboard_status_enum = PG_ENUM(
    DashboardStatus,
    name="dashboard_status_enum",
    values_callable=lambda cls: [e.value for e in cls],
    create_type=False,
)


class DashboardModel(SQLModel, table=True):
    """ORM for the `dashboard` table."""

    __tablename__ = "dashboard"
    __table_args__ = (
        UniqueConstraint("country", "name", name="uq_dashboard_country_name"),
        UniqueConstraint("country", "slug", name="uq_dashboard_country_slug"),
        Index("ix_dashboard_country_status", "country", "status"),
        Index("ix_dashboard_deployment", "deployment"),
    )

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(PG_UUID(as_uuid=True), primary_key=True, nullable=False),
    )
    country: str = Field(sa_column=Column(String, nullable=False))
    name: str = Field(sa_column=Column(String, nullable=False))
    slug: str = Field(sa_column=Column(String, nullable=False))
    status: DashboardStatus = Field(
        default=DashboardStatus.draft,
        sa_column=Column(
            _dashboard_status_enum,
            nullable=False,
            server_default=text("'draft'::dashboard_status_enum"),
        ),
    )
    deployment: str | None = Field(
        default=None, sa_column=Column(String, nullable=True)
    )
    # Full dashboard file shape: a JSON array of row objects; JSONB also allows a single object for legacy.
    config: Any = Field(sa_column=Column(JSONB, nullable=False))
    created_at: datetime.datetime = Field(
        default_factory=datetime.datetime.now,
        sa_column=Column(DateTime, nullable=False, server_default=text("now()")),
    )
    updated_at: datetime.datetime = Field(
        default_factory=datetime.datetime.now,
        sa_column=Column(
            DateTime,
            nullable=False,
            server_default=text("now()"),
            onupdate=datetime.datetime.now,
        ),
    )
    created_by: str | None = Field(
        default=None, sa_column=Column(String, nullable=True)
    )
    updated_by: str | None = Field(
        default=None, sa_column=Column(String, nullable=True)
    )
