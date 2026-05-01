"""PRISM application user mapped from CIAM (`sub` + profile fields)."""

import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy import Column, DateTime, String, text
from sqlalchemy.dialects.postgresql import ENUM, UUID as PG_UUID
from sqlmodel import Field, SQLModel


class PrismUserStatus(str, Enum):
    """Mirrors PostgreSQL enum `prism_user_status`."""

    active = "active"
    disabled = "disabled"


_prism_user_status = ENUM(
    PrismUserStatus,
    name="prism_user_status",
    create_type=False,
)


class PrismUser(SQLModel, table=True):
    """PRISM user: keyed by CIAM ``sub``."""

    __tablename__ = "users"

    id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            PG_UUID(as_uuid=True),
            primary_key=True,
            server_default=text("gen_random_uuid()"),
        ),
    )
    ciam_sub: str = Field(sa_column=Column(String, nullable=False, unique=True))
    email: Optional[str] = Field(default=None, sa_column=Column(String, nullable=True))
    name: Optional[str] = Field(default=None, sa_column=Column(String, nullable=True))
    status: PrismUserStatus = Field(
        default=PrismUserStatus.active,
        sa_column=Column(
            _prism_user_status,
            nullable=False,
            server_default=sa.text("'active'::prism_user_status"),
        ),
    )
    created_at: datetime.datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    updated_at: datetime.datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    last_login_at: Optional[datetime.datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )

    def __admin_repr__(self, request) -> str:
        return self.email or self.ciam_sub
