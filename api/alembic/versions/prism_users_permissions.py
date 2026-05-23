"""Rename ``user_info`` → ``kobo_users``; add ``users``, ``permissions``, ``user_permissions`` and seed RBAC capability rows.

The legacy ``user_info`` table (HTTP Basic auth / Kobo province gating) is renamed to
``kobo_users`` to disambiguate it from the new CIAM-backed ``users`` table added in the
same revision.

Revision ID: prism_users_permissions
Revises: map_export_jobs_001
Create Date: 2026-04-06

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "prism_users_permissions"
down_revision = "map_export_jobs_001"
branch_labels = None
depends_on = None


def upgrade() -> None:

    op.rename_table("user_info", "kobo_users")

    op.execute("CREATE TYPE user_status AS ENUM ('active', 'disabled')")

    user_status = postgresql.ENUM(
        "active",
        "disabled",
        name="user_status",
        create_type=False,
    )

    op.create_table(
        "permissions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("code", sa.String(), nullable=False),
        sa.Column("label", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )

    op.create_table(
        "users",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("ciam_sub", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column(
            "status",
            user_status,
            server_default=sa.text("'active'::user_status"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("ciam_sub"),
    )

    op.create_table(
        "user_permissions",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("permission_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "granted_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["permission_id"],
            ["permissions.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("user_id", "permission_id"),
    )

    op.create_index(
        "idx_user_permissions_permission_id",
        "user_permissions",
        ["permission_id"],
        unique=False,
    )

    op.execute("""
        INSERT INTO permissions (code, label, description)
        VALUES
            (
                'prism.content.view',
                'View gated content',
                'Read access to PRISM content that requires sign-in.'
            ),
            (
                'prism.dashboard.manage',
                'Manage dashboards',
                'Create, edit, and publish dashboard configuration.'
            ),
            (
                'prism.admin.access',
                'Access admin backend',
                'Use the Starlette admin UI and admin-only API surfaces.'
            ),
            (
                'prism.deployment.manage',
                'Manage deployment settings',
                'Change deployment-wide or system configuration.'
            ),
            (
                'prism.users.manage',
                'Manage users',
                'Provision users and assign permissions.'
            )
        ON CONFLICT (code) DO NOTHING
        """)


def downgrade() -> None:
    op.drop_index("idx_user_permissions_permission_id", table_name="user_permissions")
    op.drop_table("user_permissions")
    op.drop_table("users")
    op.drop_table("permissions")
    op.execute("DROP TYPE user_status")
    op.rename_table("kobo_users", "user_info")
