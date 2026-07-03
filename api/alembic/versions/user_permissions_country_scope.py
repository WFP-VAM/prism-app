"""Add country scope to user_permissions (``*`` = all countries).

Revision ID: user_permissions_country_scope
Revises: aa_drought_unique_country_status
Create Date: 2026-07-02

"""

import sqlalchemy as sa
from alembic import op

revision = "user_permissions_country_scope"
down_revision = "aa_drought_unique_country_status"
branch_labels = None
depends_on = None

_GLOBAL_COUNTRY = "*"


def upgrade() -> None:
    op.add_column(
        "user_permissions",
        sa.Column(
            "country",
            sa.String(),
            nullable=False,
            server_default=_GLOBAL_COUNTRY,
        ),
    )
    op.drop_constraint("user_permissions_pkey", "user_permissions", type_="primary")
    op.create_primary_key(
        "user_permissions_pkey",
        "user_permissions",
        ["user_id", "permission_id", "country"],
    )


def downgrade() -> None:
    op.drop_constraint("user_permissions_pkey", "user_permissions", type_="primary")
    op.drop_column("user_permissions", "country")
    op.create_primary_key(
        "user_permissions_pkey",
        "user_permissions",
        ["user_id", "permission_id"],
    )
