"""Add users.auth_provider and composite unique (auth_provider, ciam_sub).

Revision ID: add_users_auth_provider
Revises: add_staging_status
Create Date: 2026-06-11

"""

import sqlalchemy as sa
from alembic import op

revision = "add_users_auth_provider"
down_revision = "add_staging_status"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "auth_provider",
            sa.String(),
            nullable=False,
            server_default="ciam",
        ),
    )
    op.drop_constraint("users_ciam_sub_key", "users", type_="unique")
    op.create_unique_constraint(
        "uq_users_auth_provider_ciam_sub",
        "users",
        ["auth_provider", "ciam_sub"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_users_auth_provider_ciam_sub", "users", type_="unique")
    op.create_unique_constraint("users_ciam_sub_key", "users", ["ciam_sub"])
    op.drop_column("users", "auth_provider")
