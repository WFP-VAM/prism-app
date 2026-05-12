"""Dashboard configuration persisted in Postgres (JSONB + lifecycle)."""

import datetime
import uuid
from enum import Enum
from typing import Any

from prism_app.dashboard.util import build_dashboard_slug
from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
    event,
    text,
)
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlmodel import Field, SQLModel


class DashboardStatus(str, Enum):
    """Publication state: drafts and archived rows are not served to the PRISM UI read API."""

    draft = "draft"
    published = "published"
    archived = "archived"


# Source of truth: frontend/src/config/index.ts -> `configMap` keys.
ALLOWED_DASHBOARD_DEPLOYMENTS = (
    "afghanistan",
    "bhutan",
    "cambodia",
    "cameroon",
    "colombia",
    "cuba",
    "ecuador",
    "global",
    "haiti",
    "indonesia",
    "jordan",
    "kyrgyzstan",
    "malawi",
    "mongolia",
    "mozambique",
    "myanmar",
    "namibia",
    "nepal",
    "nigeria",
    "rbd",
    "sierraleone",
    "somalia",
    "southsudan",
    "srilanka",
    "sudan",
    "tajikistan",
    "tanzania",
    "ukraine",
    "zambia",
    "zimbabwe",
)


_dashboard_status_enum = PG_ENUM(
    DashboardStatus,
    name="dashboard_status_enum",
    values_callable=lambda cls: [e.value for e in cls],
    create_type=False,
)


class DeploymentModel(SQLModel, table=True):
    """PRISM deployment codes (``configMap`` keys); rows are seeded by migration."""

    __tablename__ = "deployment"

    code: str = Field(sa_column=Column(String, primary_key=True))


class DashboardModel(SQLModel, table=True):
    """ORM for the `dashboard` table."""

    __tablename__ = "dashboard"
    __table_args__ = (
        UniqueConstraint("deployment", "title", name="uq_dashboard_deployment_title"),
        UniqueConstraint("deployment", "slug", name="uq_dashboard_deployment_slug"),
        Index("ix_dashboard_deployment_status", "deployment", "status"),
        Index("ix_dashboard_deployment", "deployment"),
    )

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(PG_UUID(as_uuid=True), primary_key=True, nullable=False),
    )
    title: str = Field(sa_column=Column(String, nullable=False))
    slug: str = Field(sa_column=Column(String, nullable=False))
    status: DashboardStatus = Field(
        default=DashboardStatus.draft,
        sa_column=Column(
            _dashboard_status_enum,
            nullable=False,
            server_default=text("'draft'::dashboard_status_enum"),
        ),
    )
    deployment: str = Field(
        sa_column=Column(String, ForeignKey("deployment.code"), nullable=False),
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


def apply_dashboard_slug(target: DashboardModel) -> None:
    target.slug = build_dashboard_slug(target.title, target.deployment)


@event.listens_for(DashboardModel, "before_insert")
@event.listens_for(DashboardModel, "before_update")
def _derive_dashboard_slug(
    mapper: object, connection: object, target: DashboardModel
) -> None:
    apply_dashboard_slug(target)
