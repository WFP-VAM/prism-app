"""Add 'staging' to dashboard_status_enum.

Revision ID: add_staging_status
Revises: map_export_schedules_001
Create Date: 2026-06-03

"""

from alembic import op

revision = "add_staging_status"
down_revision = "map_export_schedules_001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ALTER TYPE ... ADD VALUE cannot run inside a transaction block on
    # PostgreSQL < 12, so use an autocommit block to be safe across versions.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE dashboard_status_enum ADD VALUE IF NOT EXISTS 'staging'")


def downgrade() -> None:
    # PostgreSQL does not support removing a value from an enum type.
    # Reverting would require recreating dashboard_status_enum without the
    # value, which is unsafe while rows may reference it. No-op by design.
    pass
