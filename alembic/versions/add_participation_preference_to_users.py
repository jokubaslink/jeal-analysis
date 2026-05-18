"""add participation preference to users

Revision ID: add_participation_preference
Revises: attendee_suggest_optout
Create Date: 2026-05-17
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "add_participation_preference"
down_revision: Union[str, Sequence[str], None] = "attendee_suggest_optout"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "participation_preference",
            sa.String(length=20),
            nullable=False,
            server_default="both",
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "participation_preference")
