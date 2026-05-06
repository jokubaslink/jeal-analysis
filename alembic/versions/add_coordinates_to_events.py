"""add coordinates to events

Revision ID: add_coordinates_to_events
Revises: add_is_active_to_events
Create Date: 2026-05-06

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_coordinates_to_events"
down_revision: Union[str, Sequence[str], None] = "add_is_active_to_events"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("events", sa.Column("latitude", sa.Float(), nullable=True))
    op.add_column("events", sa.Column("longitude", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("events", "longitude")
    op.drop_column("events", "latitude")
