"""create users table

Revision ID: f0b2f343732c
Revises: 
Create Date: 2022-09-01 15:37:58.659753

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "f0b2f343732c"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.BIGINT(), autoincrement=True, nullable=False),
        sa.Column(
            "username", postgresql.VARCHAR(length=255), nullable=False, unique=True
        ),
        sa.Column("full_name", postgresql.VARCHAR(length=255), nullable=True),
        sa.Column("email", postgresql.VARCHAR(length=255), nullable=False),
        sa.Column("hashed_password", postgresql.VARCHAR(length=64), nullable=False),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            postgresql.TIMESTAMP(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("users")
