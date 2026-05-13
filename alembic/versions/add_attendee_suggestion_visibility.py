"""add attendee suggestion visibility

Revision ID: attendee_suggest_optout
Revises: add_attendance_checkins
Create Date: 2026-05-13
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "attendee_suggest_optout"
down_revision: Union[str, Sequence[str], None] = "add_attendance_checkins"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "show_in_attendee_suggestions",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "show_in_attendee_suggestions")
