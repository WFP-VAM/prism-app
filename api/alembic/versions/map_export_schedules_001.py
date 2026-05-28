"""Add scheduled batch map tables and ownership metadata.

Revision ID: map_export_schedules_001
Revises: map_export_job_priority_001
Create Date: 2026-05-26

Schedule ``status`` is ``active`` (cron enqueues) or ``stopped`` (skipped).
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "map_export_schedules_001"
down_revision = "map_export_job_priority_001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "map_export_schedules",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("status", sa.String(), server_default="active", nullable=False),
        sa.Column("country", sa.String(), nullable=False),
        sa.Column("layer_id", sa.String(), nullable=False),
        sa.Column("cadence", sa.String(), nullable=False),
        sa.Column("dekad_interval", sa.Integer(), server_default="1", nullable=False),
        sa.Column("export_url", sa.String(length=4096), nullable=False),
        sa.Column("format", sa.String(), nullable=False),
        sa.Column(
            "export_options",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
        ),
        sa.Column("last_checked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_enqueued_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_enqueued_date", sa.Date(), nullable=True),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
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
        sa.ForeignKeyConstraint(
            ["created_by_user_id"],
            ["users.id"],
            name="fk_map_export_schedules_created_by_user_id_users",
            ondelete="SET NULL",
        ),
        sa.CheckConstraint(
            "status IN ('active', 'stopped')",
            name="ck_map_export_schedules_status",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_map_export_schedules_status_country_layer",
        "map_export_schedules",
        ["status", "country", "layer_id"],
        unique=False,
    )
    op.create_index(
        "ix_map_export_schedules_created_by_user_id",
        "map_export_schedules",
        ["created_by_user_id"],
        unique=False,
    )

    op.add_column(
        "map_export_jobs",
        sa.Column("map_export_schedule_id", sa.String(), nullable=True),
    )
    op.add_column(
        "map_export_jobs",
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_map_export_jobs_map_export_schedule_id_schedules",
        "map_export_jobs",
        "map_export_schedules",
        ["map_export_schedule_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_map_export_jobs_created_by_user_id_users",
        "map_export_jobs",
        "users",
        ["created_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_map_export_jobs_schedule_created",
        "map_export_jobs",
        ["map_export_schedule_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_map_export_jobs_created_by_user_id",
        "map_export_jobs",
        ["created_by_user_id"],
        unique=False,
    )

    op.execute("""
        INSERT INTO permissions (code, label, description)
        VALUES (
            'prism.map_exports.manage',
            'Manage map exports',
            'Create scheduled map exports and manage map export schedules/jobs.'
        )
        ON CONFLICT (code) DO NOTHING
        """)


def downgrade() -> None:
    op.execute("DELETE FROM permissions WHERE code = 'prism.map_exports.manage'")

    op.drop_index("ix_map_export_jobs_created_by_user_id", table_name="map_export_jobs")
    op.drop_index("ix_map_export_jobs_schedule_created", table_name="map_export_jobs")
    op.drop_constraint(
        "fk_map_export_jobs_created_by_user_id_users",
        "map_export_jobs",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_map_export_jobs_map_export_schedule_id_schedules",
        "map_export_jobs",
        type_="foreignkey",
    )
    op.drop_column("map_export_jobs", "created_by_user_id")
    op.drop_column("map_export_jobs", "map_export_schedule_id")

    op.drop_index(
        "ix_map_export_schedules_created_by_user_id",
        table_name="map_export_schedules",
    )
    op.drop_index(
        "ix_map_export_schedules_status_country_layer",
        table_name="map_export_schedules",
    )
    op.drop_table("map_export_schedules")
