"""seed sample clubs and events

Revision ID: seed_sample_clubs_and_events
Revises: add_clubs_and_events
Create Date: 2026-03-17

"""
from datetime import datetime, timedelta, timezone
from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "seed_sample_clubs_and_events"
down_revision: Union[str, Sequence[str], None] = "add_clubs_and_events"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _get_category_ids(conn) -> dict[str, uuid.UUID]:
    """Return a mapping of seeded category name -> id."""
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
    return {row.name: row.id for row in result}


def upgrade() -> None:
    """Insert sample clubs and events for local development/testing."""
    conn = op.get_bind()
    category_ids = _get_category_ids(conn)

    clubs = sa.table(
        "clubs",
        sa.column("id", sa.UUID),
        sa.column("name", sa.String),
        sa.column("description", sa.String),
        sa.column("category_id", sa.UUID),
        sa.column("city", sa.String),
        sa.column("location", sa.String),
        sa.column("website_url", sa.String),
        sa.column("is_active", sa.Boolean),
    )

    club_rows: list[dict] = []
    club_ids: dict[str, uuid.UUID] = {}

    for club in [
        {
            "name": "Vilnius Tech Runners",
            "description": "Weekly group runs, beginner-friendly training plans, and campus wellness challenges.",
            "category_name": "Sports & Fitness",
            "city": "Vilnius",
            "location": "University Stadium",
            "website_url": "https://example.com/vilnius-tech-runners",
            "is_active": True,
        },
        {
            "name": "Code & Coffee Society",
            "description": "Student-led coding sessions, hack nights, and peer support for programming projects.",
            "category_name": "STEM & Technology",
            "city": "Vilnius",
            "location": "Innovation Lab Room 204",
            "website_url": "https://example.com/code-and-coffee",
            "is_active": True,
        },
        {
            "name": "Campus Creative Collective",
            "description": "Workshops for music, photography, design, and collaborative arts events.",
            "category_name": "Arts & Culture",
            "city": "Kaunas",
            "location": "Arts Hub Studio 3",
            "website_url": "https://example.com/campus-creative-collective",
            "is_active": True,
        },
        {
            "name": "Student Volunteer Network",
            "description": "Organizes mentoring, charity drives, and local community outreach projects.",
            "category_name": "Social & Community",
            "city": "Vilnius",
            "location": "Student Center",
            "website_url": "https://example.com/student-volunteer-network",
            "is_active": True,
        },
        {
            "name": "Board Game Evenings",
            "description": "Relaxed social meetups centered around strategy games, party games, and tournaments.",
            "category_name": "Hobbies & Lifestyle",
            "city": "Klaipeda",
            "location": "Library Commons",
            "website_url": "https://example.com/board-game-evenings",
            "is_active": True,
        },
    ]:
        club_id = uuid.uuid4()
        club_ids[club["name"]] = club_id
        club_rows.append(
            {
                "id": club_id,
                "name": club["name"],
                "description": club["description"],
                "category_id": category_ids.get(club["category_name"]),
                "city": club["city"],
                "location": club["location"],
                "website_url": club["website_url"],
                "is_active": club["is_active"],
            }
        )

    if club_rows:
        op.bulk_insert(clubs, club_rows)

    events = sa.table(
        "events",
        sa.column("id", sa.UUID),
        sa.column("title", sa.String),
        sa.column("description", sa.String),
        sa.column("category_id", sa.UUID),
        sa.column("club_id", sa.UUID),
        sa.column("start_time", sa.DateTime(timezone=True)),
        sa.column("end_time", sa.DateTime(timezone=True)),
        sa.column("city", sa.String),
        sa.column("location", sa.String),
        sa.column("is_online", sa.Boolean),
        sa.column("registration_url", sa.String),
    )

    utc = timezone.utc
    event_rows = [
        {
            "id": uuid.uuid4(),
            "title": "Sunrise 5K Training Run",
            "description": "An easy-paced morning run followed by stretching and route tips for new members.",
            "category_id": category_ids.get("Sports & Fitness"),
            "club_id": club_ids["Vilnius Tech Runners"],
            "start_time": datetime(2026, 4, 4, 6, 30, tzinfo=utc),
            "end_time": datetime(2026, 4, 4, 8, 0, tzinfo=utc),
            "city": "Vilnius",
            "location": "University Stadium",
            "is_online": False,
            "registration_url": "https://example.com/events/sunrise-5k-training-run",
        },
        {
            "id": uuid.uuid4(),
            "title": "Hack Night: Build a Campus Helper App",
            "description": "A hands-on evening for shipping a small tool in teams with mentors on site.",
            "category_id": category_ids.get("STEM & Technology"),
            "club_id": club_ids["Code & Coffee Society"],
            "start_time": datetime(2026, 4, 10, 16, 0, tzinfo=utc),
            "end_time": datetime(2026, 4, 10, 20, 0, tzinfo=utc),
            "city": "Vilnius",
            "location": "Innovation Lab Room 204",
            "is_online": False,
            "registration_url": "https://example.com/events/hack-night-campus-helper",
        },
        {
            "id": uuid.uuid4(),
            "title": "Portfolio Review Workshop",
            "description": "Students share creative work and get peer feedback from designers and photographers.",
            "category_id": category_ids.get("Arts & Culture"),
            "club_id": club_ids["Campus Creative Collective"],
            "start_time": datetime(2026, 4, 12, 15, 0, tzinfo=utc),
            "end_time": datetime(2026, 4, 12, 17, 0, tzinfo=utc),
            "city": "Kaunas",
            "location": "Arts Hub Studio 3",
            "is_online": False,
            "registration_url": "https://example.com/events/portfolio-review-workshop",
        },
        {
            "id": uuid.uuid4(),
            "title": "Mentoring for First-Year Students",
            "description": "Volunteer mentors meet first-year students online to answer study and campus life questions.",
            "category_id": category_ids.get("Social & Community"),
            "club_id": club_ids["Student Volunteer Network"],
            "start_time": datetime(2026, 4, 15, 17, 0, tzinfo=utc),
            "end_time": datetime(2026, 4, 15, 18, 30, tzinfo=utc),
            "city": "Vilnius",
            "location": "Zoom",
            "is_online": True,
            "registration_url": "https://example.com/events/mentoring-first-year-students",
        },
        {
            "id": uuid.uuid4(),
            "title": "Board Game Welcome Night",
            "description": "Casual social night with quick-teach games, snacks, and tables for new players.",
            "category_id": category_ids.get("Hobbies & Lifestyle"),
            "club_id": club_ids["Board Game Evenings"],
            "start_time": datetime(2026, 4, 18, 16, 30, tzinfo=utc),
            "end_time": datetime(2026, 4, 18, 19, 30, tzinfo=utc),
            "city": "Klaipeda",
            "location": "Library Commons",
            "is_online": False,
            "registration_url": "https://example.com/events/board-game-welcome-night",
        },
        {
            "id": uuid.uuid4(),
            "title": "Open Community Meetup",
            "description": "A cross-club networking evening for students looking to discover activities and upcoming events.",
            "category_id": None,
            "club_id": None,
            "start_time": datetime(2026, 4, 22, 16, 0, tzinfo=utc),
            "end_time": datetime(2026, 4, 22, 16, 0, tzinfo=utc) + timedelta(hours=2),
            "city": "Vilnius",
            "location": "Main Campus Atrium",
            "is_online": False,
            "registration_url": "https://example.com/events/open-community-meetup",
        },
    ]

    if event_rows:
        op.bulk_insert(events, event_rows)


def downgrade() -> None:
    """Remove the sample clubs and events inserted by this migration."""
    conn = op.get_bind()

    conn.execute(
        sa.text(
            "DELETE FROM events WHERE title IN ("
            ":e1, :e2, :e3, :e4, :e5, :e6)"
        ),
        {
            "e1": "Sunrise 5K Training Run",
            "e2": "Hack Night: Build a Campus Helper App",
            "e3": "Portfolio Review Workshop",
            "e4": "Mentoring for First-Year Students",
            "e5": "Board Game Welcome Night",
            "e6": "Open Community Meetup",
        },
    )

    conn.execute(
        sa.text(
            "DELETE FROM clubs WHERE name IN ("
            ":c1, :c2, :c3, :c4, :c5)"
        ),
        {
            "c1": "Vilnius Tech Runners",
            "c2": "Code & Coffee Society",
            "c3": "Campus Creative Collective",
            "c4": "Student Volunteer Network",
            "c5": "Board Game Evenings",
        },
    )
