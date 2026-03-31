"""UserInfo database model."""

import datetime
import logging
from typing import Any

from sqlalchemy import Column, DateTime, Identity, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel

logger = logging.getLogger(__name__)


class UserInfoModel(SQLModel, table=True):
    """Auth user row; primary key is `username` (TypeORM / prod schema)."""

    __tablename__ = "user_info"

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
