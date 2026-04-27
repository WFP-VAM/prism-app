"""Add dashboard table (JSONB config, status enum, per-country uniqueness).

Revision ID: add_dashboard_table
Revises: prism_alerts_baseline
Create Date: 2026-04-27

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "add_dashboard_table"
down_revision = "prism_alerts_baseline"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "CREATE TYPE dashboard_status_enum AS ENUM ('draft', 'published')"
    )
    status_type = postgresql.ENUM(
        "draft",
        "published",
        name="dashboard_status_enum",
        create_type=False,
    )

    op.create_table(
        "dashboard",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("country", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column(
            "status",
            status_type,
            nullable=False,
            server_default=sa.text("'draft'::dashboard_status_enum"),
        ),
        sa.Column("deployment", sa.String(), nullable=True),
        sa.Column(
            "config",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("created_by", sa.String(), nullable=True),
        sa.Column("updated_by", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("country", "name", name="uq_dashboard_country_name"),
        sa.UniqueConstraint("country", "slug", name="uq_dashboard_country_slug"),
    )
    op.create_index(
        "ix_dashboard_country_status",
        "dashboard",
        ["country", "status"],
        unique=False,
    )
    op.create_index(
        "ix_dashboard_deployment",
        "dashboard",
        ["deployment"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_dashboard_deployment", table_name="dashboard")
    op.drop_index("ix_dashboard_country_status", table_name="dashboard")
    op.drop_table("dashboard")
    op.execute("DROP TYPE dashboard_status_enum")
