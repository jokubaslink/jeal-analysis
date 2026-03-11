"""seed interests

Revision ID: seed_interests
Revises: seed_interest_categories
Create Date: 2026-03-11

"""
from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "seed_interests"
down_revision: Union[str, Sequence[str], None] = "seed_interest_categories"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _get_category_ids(conn) -> dict[str, uuid.UUID]:
  """Return a mapping of category name -> id."""
  result = conn.execute(
      sa.text(
          "SELECT id, name FROM interest_categories "
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
  mapping: dict[str, uuid.UUID] = {}
  for row in result:
      mapping[row.name] = row.id
  return mapping


def upgrade() -> None:
  """Insert sample interests for the predefined categories."""
  conn = op.get_bind()
  category_ids = _get_category_ids(conn)

  interests = sa.table(
      "interests",
      sa.column("id", sa.UUID),
      sa.column("category_id", sa.UUID),
      sa.column("name", sa.String),
      sa.column("description", sa.String),
  )

  rows: list[dict] = []

  sports_id = category_ids.get("Sports & Fitness")
  if sports_id:
      rows.extend(
          [
              {
                  "id": uuid.uuid4(),
                  "category_id": sports_id,
                  "name": "Football",
                  "description": "Playing or following football and futsal.",
              },
              {
                  "id": uuid.uuid4(),
                  "category_id": sports_id,
                  "name": "Running & Athletics",
                  "description": "Track, road running, and general athletics.",
              },
              {
                  "id": uuid.uuid4(),
                  "category_id": sports_id,
                  "name": "Gym & Fitness",
                  "description": "Strength training, group classes, and fitness workouts.",
              },
          ]
      )

  arts_id = category_ids.get("Arts & Culture")
  if arts_id:
      rows.extend(
          [
              {
                  "id": uuid.uuid4(),
                  "category_id": arts_id,
                  "name": "Music & Bands",
                  "description": "Choirs, bands, and music production.",
              },
              {
                  "id": uuid.uuid4(),
                  "category_id": arts_id,
                  "name": "Theatre & Drama",
                  "description": "Acting, directing, and stage production.",
              },
              {
                  "id": uuid.uuid4(),
                  "category_id": arts_id,
                  "name": "Visual Arts",
                  "description": "Drawing, painting, photography, and design.",
              },
          ]
      )

  stem_id = category_ids.get("STEM & Technology")
  if stem_id:
      rows.extend(
          [
              {
                  "id": uuid.uuid4(),
                  "category_id": stem_id,
                  "name": "Programming & Coding",
                  "description": "Software development, hackathons, and coding meetups.",
              },
              {
                  "id": uuid.uuid4(),
                  "category_id": stem_id,
                  "name": "Robotics & Engineering",
                  "description": "Robotics clubs, makerspaces, and hardware projects.",
              },
              {
                  "id": uuid.uuid4(),
                  "category_id": stem_id,
                  "name": "Science & Research",
                  "description": "Science societies and research projects.",
              },
          ]
      )

  social_id = category_ids.get("Social & Community")
  if social_id:
      rows.extend(
          [
              {
                  "id": uuid.uuid4(),
                  "category_id": social_id,
                  "name": "Volunteering",
                  "description": "Community service, mentoring, and outreach.",
              },
              {
                  "id": uuid.uuid4(),
                  "category_id": social_id,
                  "name": "Student Union & Politics",
                  "description": "Student representation, unions, and politics.",
              },
              {
                  "id": uuid.uuid4(),
                  "category_id": social_id,
                  "name": "Social Events",
                  "description": "Meetups, parties, and community gatherings.",
              },
          ]
      )

  hobbies_id = category_ids.get("Hobbies & Lifestyle")
  if hobbies_id:
      rows.extend(
          [
              {
                  "id": uuid.uuid4(),
                  "category_id": hobbies_id,
                  "name": "Gaming & Esports",
                  "description": "Casual gaming and competitive esports.",
              },
              {
                  "id": uuid.uuid4(),
                  "category_id": hobbies_id,
                  "name": "Travel & Outdoors",
                  "description": "Hiking, trips, and outdoor adventures.",
              },
              {
                  "id": uuid.uuid4(),
                  "category_id": hobbies_id,
                  "name": "Food & Cooking",
                  "description": "Cooking clubs, food tasting, and culinary hobbies.",
              },
          ]
      )

  if rows:
      op.bulk_insert(interests, rows)


def downgrade() -> None:
  """Remove the sample interests seeded by this migration."""
  conn = op.get_bind()

  conn.execute(
      sa.text(
          "DELETE FROM interests WHERE name IN ("
          ":s1, :s2, :s3, "
          ":a1, :a2, :a3, "
          ":t1, :t2, :t3, "
          ":c1, :c2, :c3, "
          ":h1, :h2, :h3"
          ")"
      ),
      {
          "s1": "Football",
          "s2": "Running & Athletics",
          "s3": "Gym & Fitness",
          "a1": "Music & Bands",
          "a2": "Theatre & Drama",
          "a3": "Visual Arts",
          "t1": "Programming & Coding",
          "t2": "Robotics & Engineering",
          "t3": "Science & Research",
          "c1": "Volunteering",
          "c2": "Student Union & Politics",
          "c3": "Social Events",
          "h1": "Gaming & Esports",
          "h2": "Travel & Outdoors",
          "h3": "Food & Cooking",
      },
  )

