"""Permission catalog and user-permission links for app vs admin access."""

import datetime
from typing import Optional
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy import Column, DateTime, ForeignKey, String, Text, text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlmodel import Field, SQLModel


class Permission(SQLModel, table=True):
    """Grantable capability identified by stable `code` (e.g. prism.app)."""

    __tablename__ = "permissions"

    id: Optional[UUID] = Field(
        default=None,
        sa_column=Column(
            PG_UUID(as_uuid=True),
            primary_key=True,
            server_default=text("gen_random_uuid()"),
        ),
    )
    code: str = Field(sa_column=Column(String, nullable=False, unique=True))
    label: str = Field(sa_column=Column(String, nullable=False))
    description: Optional[str] = Field(
        default=None, sa_column=Column(Text, nullable=True)
    )
    created_at: datetime.datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )


class UserPermission(SQLModel, table=True):
    """Links a PRISM user to a permission (many-to-many)."""

    __tablename__ = "user_permissions"

    user_id: UUID = Field(
        sa_column=Column(
            PG_UUID(as_uuid=True),
            ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
            nullable=False,
        ),
    )
    permission_id: UUID = Field(
        sa_column=Column(
            PG_UUID(as_uuid=True),
            ForeignKey("permissions.id", ondelete="CASCADE"),
            primary_key=True,
            nullable=False,
        ),
    )
    granted_at: datetime.datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
