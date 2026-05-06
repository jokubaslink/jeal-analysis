"""merge coordinates branch into main

Revision ID: e60f298d50cb
Revises: add_coordinates_to_clubs, add_seeded_event_addresses
Create Date: 2026-05-06 18:44:51.030395

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e60f298d50cb'
down_revision: Union[str, Sequence[str], None] = ('add_coordinates_to_clubs', 'add_seeded_event_addresses')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
