"""add image_url to events

Revision ID: add_image_url_to_events
Revises: add_is_active_to_events
Create Date: 2026-04-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_image_url_to_events"
down_revision: Union[str, Sequence[str], None] = "add_is_active_to_events"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "events",
        sa.Column("image_url", sa.String(length=1000), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("events", "image_url")
