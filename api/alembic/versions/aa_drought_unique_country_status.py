"""One non-archived AA drought dataset per (country, status).

Replaces the published-only partial unique index with a broader constraint so
admin cannot create two draft or staging rows for the same country.

Revision ID: aa_drought_unique_country_status
Revises: add_aa_drought_dataset_table
Create Date: 2026-06-16

"""

import sqlalchemy as sa
from alembic import op

revision = "aa_drought_unique_country_status"
down_revision = "add_aa_drought_dataset_table"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index(
        "uq_aa_drought_published_country",
        table_name="aa_drought_dataset",
    )
    op.create_index(
        "uq_aa_drought_country_status",
        "aa_drought_dataset",
        ["country", "status"],
        unique=True,
        postgresql_where=sa.text("status != 'archived'"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_aa_drought_country_status",
        table_name="aa_drought_dataset",
    )
    op.create_index(
        "uq_aa_drought_published_country",
        "aa_drought_dataset",
        ["country"],
        unique=True,
        postgresql_where=sa.text("status = 'published'"),
    )
