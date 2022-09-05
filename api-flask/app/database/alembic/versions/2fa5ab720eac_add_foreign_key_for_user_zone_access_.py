"""add foreign key for user zone access table

Revision ID: 2fa5ab720eac
Revises: b564fe68ab4a
Create Date: 2022-09-01 16:02:49.292935

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "2fa5ab720eac"
down_revision = "b564fe68ab4a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_foreign_key(
        op.f("fk_user_zone_access_user_id_users"),
        "user_zone_access",
        "users",
        ["user_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        op.f("fk_user_zone_access_user_id_users"),
        "user_zone_access",
        type_="foreignkey",
    )
