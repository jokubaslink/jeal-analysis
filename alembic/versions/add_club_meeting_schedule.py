"""add recurring club meeting schedule

Revision ID: add_club_meeting_schedule
Revises: seed_real_lt_events_clubs
Create Date: 2026-05-05
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_club_meeting_schedule"
down_revision: Union[str, Sequence[str], None] = "seed_real_lt_events_clubs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("clubs", sa.Column("meeting_weekday", sa.Integer(), nullable=True))
    op.add_column("clubs", sa.Column("meeting_start_time", sa.Time(), nullable=True))
    op.add_column("clubs", sa.Column("meeting_end_time", sa.Time(), nullable=True))

    conn = op.get_bind()
    schedules = [
        {
            "name": "Code & Coffee Society",
            "weekday": 2,
            "start_time": "18:00:00",
            "end_time": "20:00:00",
        },
        {
            "name": "Vilnius Tech Runners",
            "weekday": 0,
            "start_time": "19:00:00",
            "end_time": "20:30:00",
        },
        {
            "name": "Board Game Evenings",
            "weekday": 4,
            "start_time": "18:30:00",
            "end_time": "21:00:00",
        },
        {
            "name": "Campus Creative Collective",
            "weekday": 3,
            "start_time": "19:00:00",
            "end_time": "21:00:00",
        },
        {
            "name": "Student Volunteer Network",
            "weekday": 1,
            "start_time": "17:30:00",
            "end_time": "19:00:00",
        },
        {
            "name": "ISM Dance Club",
            "weekday": 2,
            "start_time": "19:30:00",
            "end_time": "21:00:00",
        },
    ]

    update_stmt = sa.text(
        """
        UPDATE clubs
        SET meeting_weekday = :weekday,
            meeting_start_time = CAST(:start_time AS time),
            meeting_end_time = CAST(:end_time AS time)
        WHERE name = :name
        """
    )
    for row in schedules:
        conn.execute(update_stmt, row)


def downgrade() -> None:
    op.drop_column("clubs", "meeting_end_time")
    op.drop_column("clubs", "meeting_start_time")
    op.drop_column("clubs", "meeting_weekday")
