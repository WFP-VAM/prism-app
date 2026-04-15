"""Alert database model."""

import datetime
import json
import logging
from typing import Any

from sqlalchemy import TIMESTAMP, Boolean, Column, DateTime, Identity, Integer, String
from sqlalchemy import inspect as sa_inspect
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AlertModel(SQLModel, table=True):
    """Alert ORM that defines a table (parity with TypeORM `alert`)."""

    __tablename__ = "alert"

    id: int | None = Field(
        default=None,
        sa_column=Column(Integer, Identity(always=False), primary_key=True),
    )
    email: str = Field(sa_column=Column(String, nullable=False))
    prism_url: str = Field(sa_column=Column(String, nullable=False))
    alert_name: str | None = Field(
        default=None, sa_column=Column(String, nullable=True)
    )
    alert_config: dict[str, Any] = Field(sa_column=Column(JSONB, nullable=False))
    min: int | None = Field(default=None, sa_column=Column(Integer, nullable=True))
    max: int | None = Field(default=None, sa_column=Column(Integer, nullable=True))
    zones: dict[str, Any] | list[Any] | None = Field(
        default=None,
        sa_column=Column(JSONB, nullable=True),
    )
    active: bool = Field(
        default=True,
        sa_column=Column(Boolean, nullable=False, server_default=text("true")),
    )
    created_at: datetime.datetime = Field(
        default_factory=datetime.datetime.now,
        sa_column=Column(DateTime, nullable=False),
    )
    updated_at: datetime.datetime = Field(
        default_factory=datetime.datetime.now,
        sa_column=Column(DateTime, nullable=False, onupdate=datetime.datetime.now),
    )
    last_triggered: datetime.datetime | None = Field(
        default=None,
        sa_column=Column(TIMESTAMP(timezone=False), nullable=True),
    )


class AlchemyEncoder(json.JSONEncoder):
    """JSON-encode SQLAlchemy / SQLModel table instances."""

    def default(self, obj: Any):
        insp = sa_inspect(obj, raiseerr=False)
        if insp is not None and insp.mapper:
            fields: dict[str, Any] = {}
            for field in (
                x for x in dir(obj) if not x.startswith("_") and x != "metadata"
            ):
                data = getattr(obj, field, None)
                try:
                    json.dumps(data)
                    fields[field] = data
                except TypeError:
                    fields[field] = None
            return fields

        return json.JSONEncoder.default(self, obj)
