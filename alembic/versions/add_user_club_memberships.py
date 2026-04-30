"""add user club memberships

Revision ID: add_user_club_memberships
Revises: add_user_event_registrations
Create Date: 2026-05-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_user_club_memberships"
down_revision: Union[str, Sequence[str], None] = "add_user_event_registrations"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_club_memberships",
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
        "ix_user_club_memberships_club_id",
        "user_club_memberships",
        ["club_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_user_club_memberships_club_id", table_name="user_club_memberships")
    op.drop_table("user_club_memberships")
