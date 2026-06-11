"""Anticipatory Action drought CSV datasets persisted in Postgres (raw CSV + lifecycle)."""

import datetime
import uuid
from enum import Enum

from sqlalchemy import Column, DateTime, Index, Integer, Text, text
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlmodel import Field, SQLModel


class AaDroughtStatus(str, Enum):
    """Publication state served to the PRISM UI read API.

    ``published`` rows are served to everyone. ``staging`` rows are served only
    to staging frontends (``?include_staging=true``) so a dataset can be
    reviewed live before going public. ``draft`` and ``archived`` are never
    served.
    """

    draft = "draft"
    published = "published"
    staging = "staging"
    archived = "archived"


class AaDroughtCountry(str, Enum):
    """Countries with an Anticipatory Action drought deployment.

    Source of values: frontend AA drought configs (``anticipatoryActionDroughtUrl``).
    """

    malawi = "malawi"
    mozambique = "mozambique"
    tanzania = "tanzania"
    zambia = "zambia"
    zimbabwe = "zimbabwe"


_aa_drought_status_enum = PG_ENUM(
    AaDroughtStatus,
    name="aa_drought_status_enum",
    values_callable=lambda cls: [e.value for e in cls],
    create_type=False,
)

_aa_drought_country_enum = PG_ENUM(
    AaDroughtCountry,
    name="aa_drought_country_enum",
    values_callable=lambda cls: [e.value for e in cls],
    create_type=False,
)


class AaDroughtDatasetModel(SQLModel, table=True):
    """ORM for the `aa_drought_dataset` table.

    Each row is a complete, cumulative AA drought probabilities/triggers CSV for
    one country (all seasons, full-replace on upload). At most one ``published``
    row per country is enforced by a partial unique index.
    """

    __tablename__ = "aa_drought_dataset"
    __table_args__ = (
        # One published dataset per country (partial unique index).
        Index(
            "uq_aa_drought_published_country",
            "country",
            unique=True,
            postgresql_where=text("status = 'published'"),
        ),
        Index("ix_aa_drought_country_status", "country", "status"),
        Index("ix_aa_drought_country", "country"),
    )

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(PG_UUID(as_uuid=True), primary_key=True, nullable=False),
    )
    country: AaDroughtCountry = Field(
        sa_column=Column(_aa_drought_country_enum, nullable=False),
    )
    status: AaDroughtStatus = Field(
        default=AaDroughtStatus.draft,
        sa_column=Column(
            _aa_drought_status_enum,
            nullable=False,
            server_default=text("'draft'::aa_drought_status_enum"),
        ),
    )
    # Raw CSV text, served verbatim to the frontend Papa.parse loader.
    csv_content: str = Field(sa_column=Column(Text, nullable=False))
    # Cached data-row count for the admin list view (derived on save).
    row_count: int | None = Field(
        default=None, sa_column=Column(Integer, nullable=True)
    )
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
