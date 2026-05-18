"""Dashboard configuration persisted in Postgres (JSONB + lifecycle)."""

import datetime
import uuid
from enum import Enum
from typing import Any

from prism_app.dashboard.util import build_dashboard_path
from sqlalchemy import Column, DateTime, Index, String, UniqueConstraint, event, text
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlmodel import Field, SQLModel


class DashboardStatus(str, Enum):
    """Publication state: drafts and archived rows are not served to the PRISM UI read API."""

    draft = "draft"
    published = "published"
    archived = "archived"


class DashboardCountry(str, Enum):
    """PRISM country codes (``configMap`` keys in frontend/src/config/index.ts)."""

    afghanistan = "afghanistan"
    bhutan = "bhutan"
    cambodia = "cambodia"
    cameroon = "cameroon"
    colombia = "colombia"
    cuba = "cuba"
    ecuador = "ecuador"
    global_ = "global"
    haiti = "haiti"
    indonesia = "indonesia"
    jordan = "jordan"
    kyrgyzstan = "kyrgyzstan"
    malawi = "malawi"
    mongolia = "mongolia"
    mozambique = "mozambique"
    myanmar = "myanmar"
    namibia = "namibia"
    nepal = "nepal"
    nigeria = "nigeria"
    rbd = "rbd"
    sierraleone = "sierraleone"
    somalia = "somalia"
    southsudan = "southsudan"
    srilanka = "srilanka"
    sudan = "sudan"
    tajikistan = "tajikistan"
    tanzania = "tanzania"
    ukraine = "ukraine"
    zambia = "zambia"
    zimbabwe = "zimbabwe"


_dashboard_status_enum = PG_ENUM(
    DashboardStatus,
    name="dashboard_status_enum",
    values_callable=lambda cls: [e.value for e in cls],
    create_type=False,
)

_dashboard_country_enum = PG_ENUM(
    DashboardCountry,
    name="dashboard_country_enum",
    values_callable=lambda cls: [e.value for e in cls],
    create_type=False,
)


class DashboardModel(SQLModel, table=True):
    """ORM for the `dashboard` table."""

    __tablename__ = "dashboard"
    __table_args__ = (
        UniqueConstraint("country", "title", name="uq_dashboard_country_title"),
        UniqueConstraint("country", "path", name="uq_dashboard_country_path"),
        Index("ix_dashboard_country_status", "country", "status"),
        Index("ix_dashboard_country", "country"),
    )

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(PG_UUID(as_uuid=True), primary_key=True, nullable=False),
    )
    title: str = Field(sa_column=Column(String, nullable=False))
    path: str = Field(sa_column=Column(String, nullable=False))
    status: DashboardStatus = Field(
        default=DashboardStatus.draft,
        sa_column=Column(
            _dashboard_status_enum,
            nullable=False,
            server_default=text("'draft'::dashboard_status_enum"),
        ),
    )
    country: DashboardCountry = Field(
        sa_column=Column(_dashboard_country_enum, nullable=False),
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


def _country_code(country: DashboardCountry | str) -> str:
    if isinstance(country, DashboardCountry):
        return country.value
    return str(country)


def apply_dashboard_path(target: DashboardModel) -> None:
    target.path = build_dashboard_path(target.title, _country_code(target.country))


@event.listens_for(DashboardModel, "before_insert")
@event.listens_for(DashboardModel, "before_update")
def _derive_dashboard_path(
    mapper: object, connection: object, target: DashboardModel
) -> None:
    apply_dashboard_path(target)
