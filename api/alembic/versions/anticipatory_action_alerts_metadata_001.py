"""Add JSON ``metadata`` to anticipatory_action_alerts for hazard-specific config (flood dates.json URL, etc.)."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "anticipatory_action_alerts_metadata_001"
down_revision = "prism_users_permissions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "anticipatory_action_alerts",
        sa.Column(
            "metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
    )
    op.execute(
        sa.text(
            """UPDATE anticipatory_action_alerts
               SET metadata = CAST(:meta AS jsonb)
               WHERE type = 'flood'::anticipatory_action_alerts_type_enum
                 AND country ILIKE 'mozambique'
                 AND metadata IS NULL""",
        ).bindparams(
            meta='{"floodDatesUrl": "https://data.earthobservation.vam.wfp.org/public-share/aa/flood/moz/dates.json"}',
        ),
    )


def downgrade() -> None:
    op.drop_column("anticipatory_action_alerts", "metadata")
