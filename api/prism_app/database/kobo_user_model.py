"""Kobo/HTTP-Basic auth user model (legacy ``kobo_users`` table)."""

import datetime
import logging
from typing import Any

from sqlalchemy import Column, DateTime, Identity, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel

logger = logging.getLogger(__name__)


class KoboUser(SQLModel, table=True):
    """Kobo auth user row; primary key is ``username`` (production schema)."""

    __tablename__ = "kobo_users"

    username: str = Field(sa_column=Column(String, primary_key=True, nullable=False))
    id: int | None = Field(
        default=None,
        sa_column=Column(Integer, Identity(always=False), nullable=False, unique=False),
    )
    password: str = Field(sa_column=Column(String, nullable=False))
    salt: str | None = Field(default=None, sa_column=Column(String, nullable=True))
    access: dict[str, Any] | list[Any] | None = Field(
        default=None,
        sa_column=Column(JSONB, nullable=True),
    )
    deployment: str | None = Field(
        default=None, sa_column=Column(String, nullable=True)
    )
    organization: str | None = Field(
        default=None, sa_column=Column(String, nullable=True)
    )
    email: str | None = Field(default=None, sa_column=Column(String, nullable=True))
    details: str | None = Field(default=None, sa_column=Column(String, nullable=True))
    created_at: datetime.datetime = Field(
        default_factory=datetime.datetime.now,
        sa_column=Column(DateTime, nullable=False),
    )
