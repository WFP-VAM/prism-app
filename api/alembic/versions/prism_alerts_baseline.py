"""Baseline: alert, user_info, anticipatory_action_alerts (+ enum).

Parity with historical TypeORM migrations under `alerting/migration/`.
New schema changes: add Alembic revisions only (Python owns migrations).

Revision ID: prism_alerts_baseline
Revises:
Create Date: 2026-03-31

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy import Identity
from sqlalchemy.dialects import postgresql

revision = "prism_alerts_baseline"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "CREATE TYPE anticipatory_action_alerts_type_enum AS ENUM "
        "('storm', 'flood', 'drought')"
    )

    aa_type = postgresql.ENUM(
        "storm",
        "flood",
        "drought",
        name="anticipatory_action_alerts_type_enum",
        create_type=False,
    )

    op.create_table(
        "alert",
        sa.Column("id", sa.Integer(), Identity(always=False), primary_key=True),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("prism_url", sa.String(), nullable=False),
        sa.Column("alert_name", sa.String(), nullable=True),
        sa.Column(
            "alert_config",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
        ),
        sa.Column("min", sa.Integer(), nullable=True),
        sa.Column("max", sa.Integer(), nullable=True),
        sa.Column("zones", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "active",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("last_triggered", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "user_info",
        sa.Column("username", sa.String(), nullable=False, primary_key=True),
        sa.Column("id", sa.Integer(), Identity(always=False), nullable=False),
        sa.Column("password", sa.String(), nullable=False),
        sa.Column("salt", sa.String(), nullable=True),
        sa.Column("access", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("deployment", sa.String(), nullable=True),
        sa.Column("organization", sa.String(), nullable=True),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("details", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "anticipatory_action_alerts",
        sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column("country", sa.String(), nullable=False),
        sa.Column(
            "type",
            aa_type,
            nullable=False,
            server_default=sa.text("'storm'::anticipatory_action_alerts_type_enum"),
        ),
        sa.Column("emails", postgresql.ARRAY(sa.String()), nullable=False),
        sa.Column("prism_url", sa.String(), nullable=False),
        sa.Column("last_triggered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "last_ran_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        sa.Column(
            "last_states", postgresql.JSONB(astext_type=sa.Text()), nullable=True
        ),
    )


def downgrade() -> None:
    op.drop_table("anticipatory_action_alerts")
    op.drop_table("user_info")
    op.drop_table("alert")
    op.execute("DROP TYPE anticipatory_action_alerts_type_enum")
