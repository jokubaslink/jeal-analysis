"""add interest tables

Revision ID: add_interest_tables
Revises: add_study_fields_to_users
Create Date: 2026-03-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "add_interest_tables"
down_revision: Union[str, Sequence[str], None] = "add_study_fields_to_users"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
  """Upgrade schema."""
  op.create_table(
      "interest_categories",
      sa.Column("id", sa.UUID(), nullable=False),
      sa.Column("name", sa.String(length=255), nullable=False),
      sa.Column("description", sa.String(length=500), nullable=True),
      sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
      sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
      sa.PrimaryKeyConstraint("id"),
      sa.UniqueConstraint("name", name="uq_interest_category_name_global"),
  )

  op.create_table(
      "interests",
      sa.Column("id", sa.UUID(), nullable=False),
      sa.Column("category_id", sa.UUID(), nullable=False),
      sa.Column("name", sa.String(length=255), nullable=False),
      sa.Column("description", sa.String(length=500), nullable=True),
      sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
      sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
      sa.ForeignKeyConstraint(["category_id"], ["interest_categories.id"], ondelete="CASCADE"),
      sa.PrimaryKeyConstraint("id"),
      sa.UniqueConstraint("category_id", "name", name="uq_interest_category_name"),
  )

  op.create_table(
      "user_interests",
      sa.Column("user_id", sa.UUID(), nullable=False),
      sa.Column("interest_id", sa.UUID(), nullable=False),
      sa.Column("level", sa.String(length=50), nullable=True),
      sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
      sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
      sa.ForeignKeyConstraint(["interest_id"], ["interests.id"], ondelete="CASCADE"),
      sa.PrimaryKeyConstraint("user_id", "interest_id"),
  )


def downgrade() -> None:
  """Downgrade schema."""
  op.drop_table("user_interests")
  op.drop_table("interests")
  op.drop_table("interest_categories")

