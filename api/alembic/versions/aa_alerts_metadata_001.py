"""Add JSON metadata to anticipatory_action_alerts.

Flood rows store floodDatesUrl and optional email copy. Mozambique flood
rows with a null metadata column are backfilled.

Revision ID: aa_alerts_metadata_001
Revises: user_permissions_country_scope
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "aa_alerts_metadata_001"
down_revision = "user_permissions_country_scope"
branch_labels = None
depends_on = None

_MOZ_FLOOD_META = (
    '{"floodDatesUrl": "https://data.earthobservation.vam.wfp.org/'
    'public-share/aa/flood/moz/dates.json"}'
)


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
        ).bindparams(meta=_MOZ_FLOOD_META),
    )


def downgrade() -> None:
    op.drop_column("anticipatory_action_alerts", "metadata")
