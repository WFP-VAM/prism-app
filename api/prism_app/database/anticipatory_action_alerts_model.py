"""Anticipatory action alerts metadata table (TypeORM parity)."""

import datetime
from enum import Enum

from sqlalchemy import Column, String, text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlmodel import Field, SQLModel


class AnticipatoryActionAlertType(str, Enum):
    storm = "storm"
    flood = "flood"
    drought = "drought"


_anticipatory_action_alerts_type_enum = PG_ENUM(
    AnticipatoryActionAlertType,
    name="anticipatory_action_alerts_type_enum",
    values_callable=lambda cls: [e.value for e in cls],
    create_type=False,
)


class AnticipatoryActionAlerts(SQLModel, table=True):
    __tablename__ = "anticipatory_action_alerts"

    id: int | None = Field(default=None, primary_key=True)
    country: str = Field(sa_column=Column(String, nullable=False))
    type: AnticipatoryActionAlertType = Field(
        default=AnticipatoryActionAlertType.storm,
        sa_column=Column(_anticipatory_action_alerts_type_enum, nullable=False),
    )
    emails: list[str] = Field(sa_column=Column(ARRAY(String), nullable=False))
    prism_url: str = Field(sa_column=Column(String, nullable=False))
    last_triggered_at: datetime.datetime | None = Field(
        default=None,
        sa_column=Column(
            "last_triggered_at",
            TIMESTAMP(timezone=True),
            nullable=True,
        ),
    )
    last_ran_at: datetime.datetime | None = Field(
        default=None,
        sa_column=Column(
            "last_ran_at",
            TIMESTAMP(timezone=True),
            nullable=True,
            server_default=text("CURRENT_TIMESTAMP"),
        ),
    )
    last_states: dict[str, dict[str, str]] | None = Field(
        default=None,
        sa_column=Column(JSONB, nullable=True),
    )
