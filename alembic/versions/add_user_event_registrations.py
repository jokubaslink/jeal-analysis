"""add user event registrations

Revision ID: add_user_event_registrations
Revises: seed_lizdas_kavine_kultura_event
Create Date: 2026-04-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_user_event_registrations"
down_revision: Union[str, Sequence[str], None] = "seed_lizdas_kavine_kultura_event"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_event_registrations",
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
        "ix_user_event_registrations_event_id",
        "user_event_registrations",
        ["event_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_user_event_registrations_event_id", table_name="user_event_registrations")
    op.drop_table("user_event_registrations")
