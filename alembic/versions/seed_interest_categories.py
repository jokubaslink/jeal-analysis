"""seed interest categories

Revision ID: seed_interest_categories
Revises: add_interest_tables
Create Date: 2026-03-05

"""
from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "seed_interest_categories"
down_revision: Union[str, Sequence[str], None] = "add_interest_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Insert predefined interest categories."""
    interest_categories = sa.table(
        "interest_categories",
        sa.column("id", sa.UUID),
        sa.column("name", sa.String),
        sa.column("description", sa.String),
    )

    rows = [
        {
            "id": uuid.uuid4(),
            "name": "Sports & Fitness",
            "description": "Team sports, individual sports, and fitness activities.",
        },
        {
            "id": uuid.uuid4(),
            "name": "Arts & Culture",
            "description": "Music, theatre, visual arts, literature, and cultural events.",
        },
        {
            "id": uuid.uuid4(),
            "name": "STEM & Technology",
            "description": "Programming, engineering, science clubs, and tech projects.",
        },
        {
            "id": uuid.uuid4(),
            "name": "Social & Community",
            "description": "Volunteering, student unions, and social initiatives.",
        },
        {
            "id": uuid.uuid4(),
            "name": "Hobbies & Lifestyle",
            "description": "Gaming, travel, cooking, and other personal interests.",
        },
    ]

    op.bulk_insert(interest_categories, rows)


def downgrade() -> None:
    """Remove seeded categories by name (keeps any user-added ones)."""
    conn = op.get_bind()
    conn.execute(
        sa.text(
            "DELETE FROM interest_categories "
            "WHERE name IN (:c1, :c2, :c3, :c4, :c5)"
        ),
        {
            "c1": "Sports & Fitness",
            "c2": "Arts & Culture",
            "c3": "STEM & Technology",
            "c4": "Social & Community",
            "c5": "Hobbies & Lifestyle",
        },
    )

