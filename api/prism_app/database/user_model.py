"""Application user mapped from OIDC identity providers (``sub`` + profile fields)."""

import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

import sqlalchemy as sa
from markupsafe import escape
from prism_app.auth.admin_settings import DEFAULT_OIDC_PROVIDER_ID
from sqlalchemy import Column, DateTime, String, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import ENUM
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlmodel import Field, SQLModel


class UserStatus(str, Enum):
    """Mirrors PostgreSQL enum `user_status`."""

    active = "active"
    disabled = "disabled"


_user_status = ENUM(
    UserStatus,
    name="user_status",
    create_type=False,
)


class User(SQLModel, table=True):
    """Application user: keyed by OIDC provider id + ``sub`` (stored in ``ciam_sub``)."""

    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint(
            "auth_provider",
            "ciam_sub",
            name="uq_users_auth_provider_ciam_sub",
        ),
    )

    id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            PG_UUID(as_uuid=True),
            primary_key=True,
            server_default=text("gen_random_uuid()"),
        ),
    )
    auth_provider: str = Field(
        default=DEFAULT_OIDC_PROVIDER_ID,
        sa_column=Column(
            String,
            nullable=False,
            server_default=sa.text("'ciam'"),
        ),
    )
    ciam_sub: str = Field(sa_column=Column(String, nullable=False))
    email: Optional[str] = Field(default=None, sa_column=Column(String, nullable=True))
    name: Optional[str] = Field(default=None, sa_column=Column(String, nullable=True))
    status: UserStatus = Field(
        default=UserStatus.active,
        sa_column=Column(
            _user_status,
            nullable=False,
            server_default=sa.text("'active'::user_status"),
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

    # -- starlette-admin display helpers --
    # __admin_repr__:         plain-text shown after a user is selected
    # __admin_select2_repr__: HTML shown in the Select2 dropdown options

    def __str__(self) -> str:
        parts = [p for p in (self.name, self.email) if p]
        return " — ".join(parts) if parts else self.ciam_sub

    def __admin_repr__(self, request) -> str:
        return str(self)

    def __admin_select2_repr__(self, request) -> str:
        name = escape(self.name or "")
        email = escape(self.email or self.ciam_sub)
        return f"<span><strong>{name}</strong> {email}</span>"
