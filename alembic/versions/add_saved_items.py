"""add saved items

Revision ID: add_saved_items
Revises: add_participation_preference
Create Date: 2026-05-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_saved_items"
down_revision: Union[str, Sequence[str], None] = "add_participation_preference"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_saved_clubs",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("club_id", sa.UUID(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["club_id"], ["clubs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "club_id"),
    )
    op.create_index(
        "ix_user_saved_clubs_club_id",
        "user_saved_clubs",
        ["club_id"],
        unique=False,
    )

    op.create_table(
        "user_saved_events",
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
        "ix_user_saved_events_event_id",
        "user_saved_events",
        ["event_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_user_saved_events_event_id", table_name="user_saved_events")
    op.drop_table("user_saved_events")
    op.drop_index("ix_user_saved_clubs_club_id", table_name="user_saved_clubs")
    op.drop_table("user_saved_clubs")
