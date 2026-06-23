"""Permission catalog and user-permission links for app vs admin access."""

import datetime
from typing import Optional
from uuid import UUID

import sqlalchemy as sa
from markupsafe import escape
from sqlalchemy import Column, DateTime, ForeignKey, String, Text, text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship
from sqlmodel import Field, Relationship, SQLModel


class Permission(SQLModel, table=True):
    """Grantable capability identified by stable `code` (e.g. ``prism.admin.access``)."""

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

    # -- starlette-admin display helpers --
    # __admin_repr__:         plain-text shown after a permission is selected
    # __admin_select2_repr__: HTML shown in the Select2 dropdown options

    def __str__(self) -> str:
        return f"{self.label} ({self.code})"

    def __admin_repr__(self, request) -> str:
        return str(self)

    def __admin_select2_repr__(self, request) -> str:
        return f"<span><strong>{escape(self.label)}</strong> <code>{escape(self.code)}</code></span>"


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
    user: "User" = Relationship(
        sa_relationship=relationship(
            "User",
            primaryjoin="UserPermission.user_id == User.id",
            foreign_keys="UserPermission.user_id",
            uselist=False,
        ),
    )
    permission: Permission = Relationship(
        sa_relationship=relationship(
            Permission,
            primaryjoin="UserPermission.permission_id == Permission.id",
            foreign_keys="UserPermission.permission_id",
            uselist=False,
        ),
    )
