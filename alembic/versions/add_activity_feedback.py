"""add activity feedback tables

Revision ID: add_activity_feedback
Revises: add_club_meeting_schedule
Create Date: 2026-05-05
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "add_activity_feedback"
down_revision: Union[str, Sequence[str], None] = "add_club_meeting_schedule"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "event_feedback",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("comment", sa.String(length=1000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "event_id"),
        sa.CheckConstraint("rating >= 1 AND rating <= 5", name="ck_event_feedback_rating_range"),
    )
    op.create_table(
        "club_activity_feedback",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("club_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("activity_start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("comment", sa.String(length=1000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["club_id"], ["clubs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "club_id", "activity_start_time"),
        sa.CheckConstraint("rating >= 1 AND rating <= 5", name="ck_club_activity_feedback_rating_range"),
    )


def downgrade() -> None:
    op.drop_table("club_activity_feedback")
    op.drop_table("event_feedback")
