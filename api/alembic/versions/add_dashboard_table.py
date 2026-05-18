"""Add dashboard table (JSONB config, status enum, country-scoped uniqueness).

Revision ID: add_dashboard_table
Revises: prism_users_permissions
Create Date: 2026-04-27

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "add_dashboard_table"
down_revision = "prism_users_permissions"
branch_labels = None
depends_on = None

# Source of values: frontend/src/config/index.ts -> `configMap` keys.
_COUNTRY_CODES = (
    "afghanistan",
    "bhutan",
    "cambodia",
    "cameroon",
    "colombia",
    "cuba",
    "ecuador",
    "global",
    "haiti",
    "indonesia",
    "jordan",
    "kyrgyzstan",
    "malawi",
    "mongolia",
    "mozambique",
    "myanmar",
    "namibia",
    "nepal",
    "nigeria",
    "rbd",
    "sierraleone",
    "somalia",
    "southsudan",
    "srilanka",
    "sudan",
    "tajikistan",
    "tanzania",
    "ukraine",
    "zambia",
    "zimbabwe",
)


def upgrade() -> None:
    country_values = ", ".join(f"'{code}'" for code in _COUNTRY_CODES)
    op.execute(
        sa.text(f"CREATE TYPE dashboard_country_enum AS ENUM ({country_values})")
    )
    country_type = postgresql.ENUM(
        *_COUNTRY_CODES,
        name="dashboard_country_enum",
        create_type=False,
    )

    op.execute(
        "CREATE TYPE dashboard_status_enum AS ENUM ('draft', 'published', 'archived')"
    )
    status_type = postgresql.ENUM(
        "draft",
        "published",
        "archived",
        name="dashboard_status_enum",
        create_type=False,
    )

    op.create_table(
        "dashboard",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("path", sa.String(), nullable=False),
        sa.Column(
            "status",
            status_type,
            nullable=False,
            server_default=sa.text("'draft'::dashboard_status_enum"),
        ),
        sa.Column("country", country_type, nullable=False),
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
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("country", "title", name="uq_dashboard_country_title"),
        sa.UniqueConstraint("country", "path", name="uq_dashboard_country_path"),
    )
    op.create_index(
        "ix_dashboard_country_status",
        "dashboard",
        ["country", "status"],
        unique=False,
    )
    op.create_index(
        "ix_dashboard_country",
        "dashboard",
        ["country"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_dashboard_country", table_name="dashboard")
    op.drop_index("ix_dashboard_country_status", table_name="dashboard")
    op.drop_table("dashboard")
    op.execute("DROP TYPE dashboard_status_enum")
    op.execute("DROP TYPE dashboard_country_enum")
