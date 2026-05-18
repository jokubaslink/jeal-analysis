"""add event capacity waitlist

Revision ID: add_event_capacity_waitlist
Revises: add_image_url_to_clubs
Create Date: 2026-05-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_event_capacity_waitlist"
down_revision: Union[str, Sequence[str], None] = "add_image_url_to_clubs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("events", sa.Column("max_capacity", sa.Integer(), nullable=True))
    op.create_check_constraint(
        "ck_events_max_capacity_positive",
        "events",
        "max_capacity IS NULL OR max_capacity > 0",
    )

    op.create_table(
        "user_event_waitlist_entries",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("event_id", sa.UUID(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "event_id"),
    )
    op.create_index(
        "ix_user_event_waitlist_entries_event_created_at",
        "user_event_waitlist_entries",
        ["event_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_user_event_waitlist_entries_event_created_at",
        table_name="user_event_waitlist_entries",
    )
    op.drop_table("user_event_waitlist_entries")
    op.drop_constraint("ck_events_max_capacity_positive", "events", type_="check")
    op.drop_column("events", "max_capacity")
