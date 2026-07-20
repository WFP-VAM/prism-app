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
    # Old PK is (user_id, permission_id). Multi-country grants would collide.
    conn = op.get_bind()
    colliding = conn.execute(sa.text("""
            SELECT count(*) FROM (
                SELECT 1
                FROM user_permissions
                GROUP BY user_id, permission_id
                HAVING count(*) > 1
            ) d
            """)).scalar()
    if colliding:
        raise RuntimeError(
            "Cannot downgrade user_permissions_country_scope: "
            f"{colliding} user+permission pair(s) have multiple country-scoped rows. "
            "Merge or delete extras so each (user_id, permission_id) has one row, "
            "then re-run the downgrade."
        )

    op.drop_constraint("user_permissions_pkey", "user_permissions", type_="primary")
    op.drop_column("user_permissions", "country")
    op.create_primary_key(
        "user_permissions_pkey",
        "user_permissions",
        ["user_id", "permission_id"],
    )
