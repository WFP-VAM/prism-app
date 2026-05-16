"""Add map_export_jobs.priority for queue ordering (interactive > scheduled public).

Revision ID: map_export_job_priority_001
Revises: prism_users_permissions
Create Date: 2026-05-16

Higher priority rows are claimed first; then oldest created_at.
API / user-initiated jobs default to 200; scheduled public map cron uses 100.

"""

import sqlalchemy as sa
from alembic import op

revision = "map_export_job_priority_001"
down_revision = "prism_users_permissions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "map_export_jobs",
        sa.Column(
            "priority",
            sa.Integer(),
            server_default="200",
            nullable=False,
        ),
    )
    op.create_index(
        "ix_map_export_jobs_status_priority_created",
        "map_export_jobs",
        ["status", "priority", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_map_export_jobs_status_priority_created",
        table_name="map_export_jobs",
    )
    op.drop_column("map_export_jobs", "priority")
