"""map_export_jobs table for async batch map exports."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "map_export_jobs_001"
down_revision = "prism_alerts_baseline"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "map_export_jobs",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("request_fingerprint", sa.String(), nullable=False),
        sa.Column(
            "request_payload_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
        ),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column(
            "error_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column("s3_uri", sa.String(), nullable=True),
        sa.Column("content_type", sa.String(), nullable=True),
        sa.Column("origin_url", sa.String(length=2048), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("progress_current", sa.Integer(), nullable=True),
        sa.Column("progress_total", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
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
    op.drop_table("map_export_jobs")
