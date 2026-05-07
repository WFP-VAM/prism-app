"""map_export_jobs: requested_by -> origin_url."""

import sqlalchemy as sa
from alembic import op

revision = "map_export_jobs_002_origin_url"
down_revision = "map_export_jobs_001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index(
        "ix_map_export_jobs_principal_fingerprint",
        table_name="map_export_jobs",
    )
    op.add_column(
        "map_export_jobs",
        sa.Column("origin_url", sa.String(length=2048), nullable=True),
    )
    op.drop_column("map_export_jobs", "requested_by")
    op.create_index(
        "ix_map_export_jobs_request_fingerprint",
        "map_export_jobs",
        ["request_fingerprint"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_map_export_jobs_request_fingerprint",
        table_name="map_export_jobs",
    )
    op.add_column(
        "map_export_jobs",
        sa.Column(
            "requested_by",
            sa.String(),
            nullable=False,
            server_default="__map_export__",
        ),
    )
    op.drop_column("map_export_jobs", "origin_url")
    op.create_index(
        "ix_map_export_jobs_principal_fingerprint",
        "map_export_jobs",
        ["requested_by", "request_fingerprint"],
        unique=False,
    )
    op.alter_column(
        "map_export_jobs",
        "requested_by",
        server_default=None,
    )
