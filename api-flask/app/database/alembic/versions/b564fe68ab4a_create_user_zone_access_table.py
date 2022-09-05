"""create user zone access table

Revision ID: b564fe68ab4a
Revises: f0b2f343732c
Create Date: 2022-09-01 15:56:02.458253

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "b564fe68ab4a"
down_revision = "f0b2f343732c"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_zone_access",
        sa.Column("id", postgresql.BIGINT(), autoincrement=True, nullable=False),
        sa.Column("user_id", postgresql.BIGINT(), nullable=False),
        sa.Column("zones_url", postgresql.VARCHAR(length=255), nullable=False),
        sa.Column("has_access", postgresql.BOOLEAN, nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("user_zone_access")
