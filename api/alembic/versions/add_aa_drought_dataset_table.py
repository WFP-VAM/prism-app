"""Add aa_drought_dataset table + seed prism.aa_data.manage permission.

Stores government-uploaded Anticipatory Action drought CSVs (raw text + draft/
staging/published/archived lifecycle), served back to PRISM by the read API.
At most one published dataset per country (partial unique index).

Revision ID: add_aa_drought_dataset_table
Revises: add_staging_status
Create Date: 2026-06-11

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "add_aa_drought_dataset_table"
down_revision = "add_staging_status"
branch_labels = None
depends_on = None

# AA drought deployments (frontend anticipatoryActionDroughtUrl configs).
_AA_COUNTRY_CODES = (
    "malawi",
    "mozambique",
    "tanzania",
    "zambia",
    "zimbabwe",
)
_AA_STATUSES = ("draft", "published", "staging", "archived")


def upgrade() -> None:
    country_values = ", ".join(f"'{code}'" for code in _AA_COUNTRY_CODES)
    op.execute(
        sa.text(f"CREATE TYPE aa_drought_country_enum AS ENUM ({country_values})")
    )
    country_type = postgresql.ENUM(
        *_AA_COUNTRY_CODES,
        name="aa_drought_country_enum",
        create_type=False,
    )

    status_values = ", ".join(f"'{s}'" for s in _AA_STATUSES)
    op.execute(sa.text(f"CREATE TYPE aa_drought_status_enum AS ENUM ({status_values})"))
    status_type = postgresql.ENUM(
        *_AA_STATUSES,
        name="aa_drought_status_enum",
        create_type=False,
    )

    op.create_table(
        "aa_drought_dataset",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("country", country_type, nullable=False),
        sa.Column(
            "status",
            status_type,
            nullable=False,
            server_default=sa.text("'draft'::aa_drought_status_enum"),
        ),
        sa.Column("csv_content", sa.Text(), nullable=False),
        sa.Column("row_count", sa.Integer(), nullable=True),
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
    )
    # At most one published dataset per country.
    op.create_index(
        "uq_aa_drought_published_country",
        "aa_drought_dataset",
        ["country"],
        unique=True,
        postgresql_where=sa.text("status = 'published'"),
    )
    op.create_index(
        "ix_aa_drought_country_status",
        "aa_drought_dataset",
        ["country", "status"],
        unique=False,
    )
    op.create_index(
        "ix_aa_drought_country",
        "aa_drought_dataset",
        ["country"],
        unique=False,
    )

    op.execute(
        """
        INSERT INTO permissions (code, label, description)
        VALUES
            (
                'prism.aa_data.manage',
                'Manage AA drought data',
                'Upload, validate, and publish Anticipatory Action drought CSV datasets.'
            )
        ON CONFLICT (code) DO NOTHING
        """
    )


def downgrade() -> None:
    op.execute("DELETE FROM permissions WHERE code = 'prism.aa_data.manage'")
    op.drop_index("ix_aa_drought_country", table_name="aa_drought_dataset")
    op.drop_index("ix_aa_drought_country_status", table_name="aa_drought_dataset")
    op.drop_index("uq_aa_drought_published_country", table_name="aa_drought_dataset")
    op.drop_table("aa_drought_dataset")
    op.execute("DROP TYPE aa_drought_status_enum")
    op.execute("DROP TYPE aa_drought_country_enum")
