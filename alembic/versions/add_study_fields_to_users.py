"""add study fields to users

Revision ID: add_study_fields_to_users
Revises: 15b9c961c817
Create Date: 2026-03-03

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "add_study_fields_to_users"
down_revision: Union[str, Sequence[str], None] = "edede03abe97"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("users", sa.Column("name", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("programme", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("year", sa.Integer(), nullable=True))
    op.add_column("users", sa.Column("faculty", sa.String(length=255), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("users", "faculty")
    op.drop_column("users", "year")
    op.drop_column("users", "programme")
    op.drop_column("users", "name")

