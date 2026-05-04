"""seed rich demo events

Revision ID: seed_rich_demo_events
Revises: add_user_club_memberships
Create Date: 2026-05-04

Adds a larger future-facing event set for local testing and demo quality. The
events are spread across categories, cities, and dates so filters,
recommendations, event detail pages, and dashboard registrations have realistic
data to work with.
"""
from datetime import datetime, timezone
from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa


revision: str = "seed_rich_demo_events"
down_revision: Union[str, Sequence[str], None] = "add_user_club_memberships"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


EVENT_TITLES: list[str] = [
    "Campus Summer Kickoff Fair",
    "Weekly Beginner Run and Mobility Session",
    "Code Clinic: Debug Your Coursework",
    "Open Mic and Poetry Night",
    "Board Games and Tea Social",
    "Volunteer Orientation: Food Bank Shift",
    "Student Startup Pitch Practice",
    "Outdoor Yoga by the River",
    "Photography Walk: Old Town Details",
    "AI Study Group: Building a Tiny Recommender",
    "Friday Night DJ Social",
    "Community Garden Planting Morning",
    "CV Sprint and LinkedIn Photo Corner",
    "Basketball 3x3 Friendly Tournament",
    "Film Club Screening: Baltic Shorts",
    "Hack Weekend: Student Life Tools",
    "Cooking Together: Budget Meal Prep",
    "Karaoke and Mocktail Night",
    "Career Talk: From Student Project to First Job",
    "Campus Clean-Up and Picnic",
    "Dance Taster: Salsa for Complete Beginners",
    "Museum Evening: Student Guided Tour",
    "Running Club 10K Prep Session",
    "Design Jam: Poster Night for Clubs",
    "Online Exam Prep Accountability Room",
    "End-of-Semester Courtyard Party",
]


def _get_category_ids(conn) -> dict[str, uuid.UUID]:
    result = conn.execute(
        sa.text(
            "SELECT id, name FROM interest_categories "
            "WHERE name IN (:sports, :arts, :stem, :social, :hobbies)"
        ),
        {
            "sports": "Sports & Fitness",
            "arts": "Arts & Culture",
            "stem": "STEM & Technology",
            "social": "Social & Community",
            "hobbies": "Hobbies & Lifestyle",
        },
    )
    return {row.name: row.id for row in result}


def _get_club_ids(conn) -> dict[str, uuid.UUID]:
    result = conn.execute(
        sa.text(
            "SELECT id, name FROM clubs "
            "WHERE name IN (:runners, :code, :creative, :volunteer, :games)"
        ),
        {
            "runners": "Vilnius Tech Runners",
            "code": "Code & Coffee Society",
            "creative": "Campus Creative Collective",
            "volunteer": "Student Volunteer Network",
            "games": "Board Game Evenings",
        },
    )
    return {row.name: row.id for row in result}


def upgrade() -> None:
    conn = op.get_bind()
    category_ids = _get_category_ids(conn)
    club_ids = _get_club_ids(conn)

    existing_titles = {
        row.title
        for row in conn.execute(
            sa.text("SELECT title FROM events WHERE title IN :titles").bindparams(
                sa.bindparam("titles", expanding=True)
            ),
            {"titles": EVENT_TITLES},
        )
    }

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
        sa.column("is_active", sa.Boolean),
        sa.column("is_online", sa.Boolean),
        sa.column("registration_url", sa.String),
        sa.column("image_url", sa.String),
    )

    utc = timezone.utc
    sports = category_ids.get("Sports & Fitness")
    arts = category_ids.get("Arts & Culture")
    stem = category_ids.get("STEM & Technology")
    social = category_ids.get("Social & Community")
    hobbies = category_ids.get("Hobbies & Lifestyle")

    runners = club_ids.get("Vilnius Tech Runners")
    code = club_ids.get("Code & Coffee Society")
    creative = club_ids.get("Campus Creative Collective")
    volunteer = club_ids.get("Student Volunteer Network")
    games = club_ids.get("Board Game Evenings")

    event_rows = [
        {
            "id": uuid.uuid4(),
            "title": "Campus Summer Kickoff Fair",
            "description": "A relaxed outdoor fair where clubs introduce summer plans, quick activities, and ways to join before exams finish.",
            "category_id": social,
            "club_id": None,
            "start_time": datetime(2026, 5, 9, 12, 0, tzinfo=utc),
            "end_time": datetime(2026, 5, 9, 16, 0, tzinfo=utc),
            "city": "Vilnius",
            "location": "Main Campus Courtyard",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://example.com/events/campus-summer-kickoff-fair",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "Weekly Beginner Run and Mobility Session",
            "description": "A recurring-style Monday session with a 3 km group run, warm-up drills, and stretching for new runners.",
            "category_id": sports,
            "club_id": runners,
            "start_time": datetime(2026, 5, 11, 16, 30, tzinfo=utc),
            "end_time": datetime(2026, 5, 11, 18, 0, tzinfo=utc),
            "city": "Vilnius",
            "location": "University Stadium Gate",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://example.com/events/weekly-beginner-run-mobility",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "Code Clinic: Debug Your Coursework",
            "description": "Drop in with a programming assignment, get peer help, and learn a few debugging habits that make projects less stressful.",
            "category_id": stem,
            "club_id": code,
            "start_time": datetime(2026, 5, 12, 14, 0, tzinfo=utc),
            "end_time": datetime(2026, 5, 12, 17, 0, tzinfo=utc),
            "city": "Vilnius",
            "location": "Innovation Lab Room 204",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://example.com/events/code-clinic-debug-coursework",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "Open Mic and Poetry Night",
            "description": "A small-stage evening for student musicians, spoken-word pieces, and first-time performers in a supportive room.",
            "category_id": arts,
            "club_id": creative,
            "start_time": datetime(2026, 5, 14, 17, 30, tzinfo=utc),
            "end_time": datetime(2026, 5, 14, 20, 30, tzinfo=utc),
            "city": "Kaunas",
            "location": "Arts Hub Studio 3",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://example.com/events/open-mic-poetry-night",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "Board Games and Tea Social",
            "description": "A low-pressure social evening with quick-teach board games, tea, and tables grouped by game length.",
            "category_id": hobbies,
            "club_id": games,
            "start_time": datetime(2026, 5, 16, 15, 0, tzinfo=utc),
            "end_time": datetime(2026, 5, 16, 19, 0, tzinfo=utc),
            "city": "Klaipeda",
            "location": "Library Commons",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://example.com/events/board-games-tea-social",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "Volunteer Orientation: Food Bank Shift",
            "description": "New volunteers learn how the student food bank works, then sign up for packing and distribution shifts.",
            "category_id": social,
            "club_id": volunteer,
            "start_time": datetime(2026, 5, 19, 15, 0, tzinfo=utc),
            "end_time": datetime(2026, 5, 19, 17, 0, tzinfo=utc),
            "city": "Vilnius",
            "location": "Student Center Room B12",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://example.com/events/volunteer-orientation-food-bank",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "Student Startup Pitch Practice",
            "description": "Teams test three-minute pitches, receive feedback from alumni mentors, and refine their next steps.",
            "category_id": stem,
            "club_id": code,
            "start_time": datetime(2026, 5, 21, 16, 0, tzinfo=utc),
            "end_time": datetime(2026, 5, 21, 18, 30, tzinfo=utc),
            "city": "Vilnius",
            "location": "Business Incubator Hall",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://example.com/events/student-startup-pitch-practice",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "Outdoor Yoga by the River",
            "description": "A gentle beginner-friendly yoga class focused on mobility, breathing, and a calmer exam season.",
            "category_id": sports,
            "club_id": runners,
            "start_time": datetime(2026, 5, 24, 8, 0, tzinfo=utc),
            "end_time": datetime(2026, 5, 24, 9, 15, tzinfo=utc),
            "city": "Kaunas",
            "location": "Nemunas Island Lawn",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://example.com/events/outdoor-yoga-river",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "Photography Walk: Old Town Details",
            "description": "Students explore composition, texture, and street photography during a guided walk through Old Town.",
            "category_id": arts,
            "club_id": creative,
            "start_time": datetime(2026, 5, 27, 15, 30, tzinfo=utc),
            "end_time": datetime(2026, 5, 27, 18, 0, tzinfo=utc),
            "city": "Vilnius",
            "location": "Cathedral Square Meeting Point",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://example.com/events/photography-walk-old-town",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "AI Study Group: Building a Tiny Recommender",
            "description": "A practical study group where students build a simple recommendation script and discuss how matching scores work.",
            "category_id": stem,
            "club_id": code,
            "start_time": datetime(2026, 5, 29, 13, 0, tzinfo=utc),
            "end_time": datetime(2026, 5, 29, 16, 0, tzinfo=utc),
            "city": "Vilnius",
            "location": "Computer Lab 2.08",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://example.com/events/ai-study-group-tiny-recommender",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "Friday Night DJ Social",
            "description": "An informal student party with local DJs, a chill lounge corner, and space to meet people after lectures.",
            "category_id": social,
            "club_id": None,
            "start_time": datetime(2026, 6, 5, 18, 0, tzinfo=utc),
            "end_time": datetime(2026, 6, 5, 22, 0, tzinfo=utc),
            "city": "Kaunas",
            "location": "Student Union Hall",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://example.com/events/friday-night-dj-social",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "Community Garden Planting Morning",
            "description": "Help plant herbs and flowers in the campus garden, then stay for coffee with the volunteer team.",
            "category_id": social,
            "club_id": volunteer,
            "start_time": datetime(2026, 6, 7, 8, 30, tzinfo=utc),
            "end_time": datetime(2026, 6, 7, 11, 30, tzinfo=utc),
            "city": "Vilnius",
            "location": "Campus Garden",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://example.com/events/community-garden-planting",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "CV Sprint and LinkedIn Photo Corner",
            "description": "A practical career session with quick CV reviews, profile tips, and a simple photo corner for students.",
            "category_id": social,
            "club_id": None,
            "start_time": datetime(2026, 6, 10, 13, 0, tzinfo=utc),
            "end_time": datetime(2026, 6, 10, 16, 0, tzinfo=utc),
            "city": "Vilnius",
            "location": "Career Center",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://example.com/events/cv-sprint-linkedin-photo",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "Basketball 3x3 Friendly Tournament",
            "description": "Mixed teams play short friendly games. Solo sign-ups are welcome and teams are balanced on arrival.",
            "category_id": sports,
            "club_id": runners,
            "start_time": datetime(2026, 6, 13, 10, 0, tzinfo=utc),
            "end_time": datetime(2026, 6, 13, 14, 0, tzinfo=utc),
            "city": "Vilnius",
            "location": "Outdoor Basketball Courts",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://example.com/events/basketball-3x3-friendly",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "Film Club Screening: Baltic Shorts",
            "description": "A curated screening of short films from the Baltics followed by a student-led discussion.",
            "category_id": arts,
            "club_id": creative,
            "start_time": datetime(2026, 6, 17, 17, 0, tzinfo=utc),
            "end_time": datetime(2026, 6, 17, 20, 0, tzinfo=utc),
            "city": "Kaunas",
            "location": "Small Cinema Auditorium",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://example.com/events/film-club-baltic-shorts",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "Hack Weekend: Student Life Tools",
            "description": "A weekend build sprint for small apps that improve commuting, club discovery, study planning, or campus life.",
            "category_id": stem,
            "club_id": code,
            "start_time": datetime(2026, 6, 20, 8, 0, tzinfo=utc),
            "end_time": datetime(2026, 6, 21, 16, 0, tzinfo=utc),
            "city": "Vilnius",
            "location": "Innovation Lab",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://example.com/events/hack-weekend-student-life-tools",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "Cooking Together: Budget Meal Prep",
            "description": "Students cook three affordable meals together and swap practical tips for weekly planning.",
            "category_id": hobbies,
            "club_id": games,
            "start_time": datetime(2026, 6, 24, 15, 0, tzinfo=utc),
            "end_time": datetime(2026, 6, 24, 18, 0, tzinfo=utc),
            "city": "Klaipeda",
            "location": "Student Kitchen Studio",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://example.com/events/cooking-budget-meal-prep",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "Karaoke and Mocktail Night",
            "description": "A friendly party night with karaoke rounds, non-alcoholic drinks, and optional group performances.",
            "category_id": hobbies,
            "club_id": games,
            "start_time": datetime(2026, 6, 27, 18, 30, tzinfo=utc),
            "end_time": datetime(2026, 6, 27, 22, 0, tzinfo=utc),
            "city": "Vilnius",
            "location": "Campus Cafe Stage",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://example.com/events/karaoke-mocktail-night",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "Career Talk: From Student Project to First Job",
            "description": "Recent graduates share how club projects became portfolio pieces, internships, and first full-time roles.",
            "category_id": stem,
            "club_id": code,
            "start_time": datetime(2026, 7, 2, 14, 0, tzinfo=utc),
            "end_time": datetime(2026, 7, 2, 16, 0, tzinfo=utc),
            "city": "Vilnius",
            "location": "Online",
            "is_active": True,
            "is_online": True,
            "registration_url": "https://example.com/events/career-talk-student-project-first-job",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "Campus Clean-Up and Picnic",
            "description": "A practical volunteering morning followed by a picnic for everyone who helps clean shared outdoor spaces.",
            "category_id": social,
            "club_id": volunteer,
            "start_time": datetime(2026, 7, 5, 8, 0, tzinfo=utc),
            "end_time": datetime(2026, 7, 5, 12, 0, tzinfo=utc),
            "city": "Kaunas",
            "location": "Student Dormitory Courtyard",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://example.com/events/campus-cleanup-picnic",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "Dance Taster: Salsa for Complete Beginners",
            "description": "A no-experience-needed dance class with simple partner steps, rotation, and a social practice hour.",
            "category_id": hobbies,
            "club_id": None,
            "start_time": datetime(2026, 7, 9, 16, 30, tzinfo=utc),
            "end_time": datetime(2026, 7, 9, 19, 0, tzinfo=utc),
            "city": "Vilnius",
            "location": "Student Union Dance Studio",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://example.com/events/salsa-beginners-taster",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "Museum Evening: Student Guided Tour",
            "description": "An after-hours museum visit with a student guide, slow looking prompts, and time for discussion.",
            "category_id": arts,
            "club_id": creative,
            "start_time": datetime(2026, 7, 15, 16, 0, tzinfo=utc),
            "end_time": datetime(2026, 7, 15, 18, 30, tzinfo=utc),
            "city": "Kaunas",
            "location": "M. K. Ciurlionis National Museum of Art",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://example.com/events/museum-evening-student-tour",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "Running Club 10K Prep Session",
            "description": "A recurring-style Wednesday training session with pacing groups for students preparing for their first 10K.",
            "category_id": sports,
            "club_id": runners,
            "start_time": datetime(2026, 7, 22, 16, 0, tzinfo=utc),
            "end_time": datetime(2026, 7, 22, 18, 0, tzinfo=utc),
            "city": "Vilnius",
            "location": "Vingis Park Entrance",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://example.com/events/running-club-10k-prep",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "Design Jam: Poster Night for Clubs",
            "description": "A hands-on design evening where students make event posters and social media graphics for campus clubs.",
            "category_id": arts,
            "club_id": creative,
            "start_time": datetime(2026, 7, 30, 15, 0, tzinfo=utc),
            "end_time": datetime(2026, 7, 30, 18, 30, tzinfo=utc),
            "city": "Vilnius",
            "location": "Media Lab",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://example.com/events/design-jam-poster-night",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "Online Exam Prep Accountability Room",
            "description": "A quiet online study room with timed focus blocks, short breaks, and check-ins for summer resits.",
            "category_id": social,
            "club_id": None,
            "start_time": datetime(2026, 8, 4, 8, 0, tzinfo=utc),
            "end_time": datetime(2026, 8, 4, 11, 0, tzinfo=utc),
            "city": "Online",
            "location": "Microsoft Teams",
            "is_active": True,
            "is_online": True,
            "registration_url": "https://example.com/events/online-exam-prep-accountability",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "End-of-Semester Courtyard Party",
            "description": "A bigger student party with DJ sets, club booths, outdoor games, and relaxed spaces for quieter chats.",
            "category_id": social,
            "club_id": None,
            "start_time": datetime(2026, 8, 14, 17, 0, tzinfo=utc),
            "end_time": datetime(2026, 8, 14, 22, 0, tzinfo=utc),
            "city": "Vilnius",
            "location": "Main Campus Courtyard",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://example.com/events/end-of-semester-courtyard-party",
            "image_url": None,
        },
    ]

    rows_to_insert = [
        row for row in event_rows if row["title"] not in existing_titles
    ]
    if rows_to_insert:
        op.bulk_insert(events, rows_to_insert)


def downgrade() -> None:
    conn = op.get_bind()
    params = {f"t{i}": title for i, title in enumerate(EVENT_TITLES)}
    placeholders = ", ".join(f":{name}" for name in params)
    conn.execute(
        sa.text(f"DELETE FROM events WHERE title IN ({placeholders})"),
        params,
    )
