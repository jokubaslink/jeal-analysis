"""add is_admin to users

Revision ID: add_is_admin_to_users
Revises: seed_sample_clubs_and_events
Create Date: 2026-04-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_is_admin_to_users"
down_revision: Union[str, Sequence[str], None] = "seed_sample_clubs_and_events"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("is_admin", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )


def downgrade() -> None:
    op.drop_column("users", "is_admin")
