"""map_export_schedules table and map_export_jobs.schedule_id lineage."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "map_export_schedules_001"
down_revision = "prism_users_permissions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "map_export_schedules",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("cron_expression", sa.String(), nullable=False),
        sa.Column(
            "request_payload_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
        ),
        sa.Column("max_runs", sa.Integer(), nullable=False),
        sa.Column(
            "runs_completed",
            sa.Integer(),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column("next_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_run_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_map_export_schedules_next_run_at",
        "map_export_schedules",
        ["next_run_at"],
        unique=False,
    )
    op.add_column(
        "map_export_jobs",
        sa.Column("schedule_id", sa.String(), nullable=True),
    )
    op.create_foreign_key(
        "fk_map_export_jobs_schedule_id",
        "map_export_jobs",
        "map_export_schedules",
        ["schedule_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_map_export_jobs_schedule_id",
        "map_export_jobs",
        ["schedule_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_map_export_jobs_schedule_id", table_name="map_export_jobs")
    op.drop_constraint(
        "fk_map_export_jobs_schedule_id",
        "map_export_jobs",
        type_="foreignkey",
    )
    op.drop_column("map_export_jobs", "schedule_id")
    op.drop_index(
        "ix_map_export_schedules_next_run_at",
        table_name="map_export_schedules",
    )
    op.drop_table("map_export_schedules")
