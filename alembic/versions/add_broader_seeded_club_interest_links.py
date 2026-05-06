"""add broader seeded interests, clubs, events, and club-interest links

Revision ID: seed_club_interest_links
Revises: add_activity_feedback
Create Date: 2026-05-06

Adds a direct seeded mapping from interests to clubs so recommendations can
prefer exact student interests while still using categories for broader matches.
The added clubs are based on real Lithuanian university activity areas and
official student organisation pages where possible.
"""
from datetime import datetime, time, timezone
from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa


revision: str = "seed_club_interest_links"
down_revision: Union[str, Sequence[str], None] = "add_activity_feedback"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


INTERESTS_BY_CATEGORY: dict[str, list[tuple[str, str]]] = {
    "Sports & Fitness": [
        ("Basketball", "Campus basketball, 3x3 tournaments, and supporter communities."),
        ("Volleyball", "Indoor and beach volleyball training, games, and fan groups."),
        ("Cycling", "Road, city, and recreational cycling with student groups."),
        ("Yoga & Mobility", "Yoga, stretching, mobility work, and recovery routines."),
        ("Outdoor Hiking", "Nature walks, hiking trips, and active weekend routes."),
        ("Chess & Strategy", "Chess, strategic thinking, and friendly competitive play."),
        ("Wellness & Mental Health", "Healthy routines, stress management, and wellbeing habits."),
    ],
    "Arts & Culture": [
        ("Choir & Vocal Music", "Choirs, vocal practice, concerts, and ensemble singing."),
        ("Dance & Performance", "Folk dance, social dance, stage movement, and performance."),
        ("Film & Media", "Film screenings, video storytelling, and media discussions."),
        ("Photography", "Photo walks, editing, visual storytelling, and exhibitions."),
        ("Creative Writing", "Poetry, essays, storytelling, and spoken-word formats."),
        ("Cultural Heritage", "Language, traditions, heritage events, and cultural exchange."),
        ("Design & Illustration", "Graphic design, posters, illustration, and visual identity work."),
    ],
    "STEM & Technology": [
        ("Data Science & AI", "Data analysis, machine learning, AI tools, and applied projects."),
        ("Cybersecurity", "Security basics, capture-the-flag practice, and safe systems."),
        ("Electronics & Makerspaces", "Hardware prototyping, electronics, and maker workshops."),
        ("Entrepreneurship", "Startup ideas, pitch practice, and student venture building."),
        ("Finance & Investing", "Markets, investing fundamentals, and financial analysis."),
        ("Civil Engineering", "Structures, bridges, construction, and built-environment projects."),
        ("Mathematics", "Mathematics societies, problem solving, and quantitative research."),
    ],
    "Social & Community": [
        ("International Student Support", "Buddy systems, exchange student integration, and ESN activities."),
        ("Mentoring", "Peer mentoring, first-year support, and practical student guidance."),
        ("Debate & Public Speaking", "Debate, argumentation, public speaking, and civic dialogue."),
        ("Sustainability", "Environmental action, campus sustainability, and climate projects."),
        ("Leadership & Representation", "Student unions, representation, advocacy, and governance."),
        ("Inclusion & Accessibility", "Equal opportunities, disability support, and inclusive community work."),
        ("Human Rights & Civic Action", "Civil society, tolerance, rights, and public initiatives."),
    ],
    "Hobbies & Lifestyle": [
        ("Board Games", "Strategy games, party games, tabletop meetups, and casual tournaments."),
        ("Language Exchange", "Practicing languages with local and international students."),
        ("Japanese Culture", "Japanese language, culture, games, food, and community events."),
        ("Nature & Biodiversity", "Nature clubs, biodiversity walks, and environmental observation."),
        ("Travel Planning", "Student trips, exchange stories, and low-budget travel planning."),
        ("Cooking on a Budget", "Affordable recipes, meal prep, and shared student cooking."),
        ("Casual Socials", "Low-pressure meetups, quiz nights, and community evenings."),
    ],
}


CLUB_ROWS: list[dict] = [
    {
        "name": "KTU Sports Teams",
        "description": "Kaunas University of Technology sports teams for students who want to train, represent the university, and compete in student championships.",
        "category_name": "Sports & Fitness",
        "city": "Kaunas",
        "location": "KTU Sports and Wellness Centre, Studentu St. 48",
        "website_url": "https://sports.ktu.edu/teams/",
        "meeting_weekday": 1,
        "meeting_start_time": time(18, 0),
        "meeting_end_time": time(20, 0),
    },
    {
        "name": "VILNIUS TECH Tourism Club",
        "description": "Long-running VILNIUS TECH student initiative for active tourism, nature trips, hiking skills, and meaningful outdoor recreation.",
        "category_name": "Sports & Fitness",
        "city": "Vilnius",
        "location": "VILNIUS TECH Sports and Arts Centre",
        "website_url": "https://vilniustech.lt/en/sports-and-arts-centre/leisure/sports-clubs/",
        "meeting_weekday": 3,
        "meeting_start_time": time(18, 30),
        "meeting_end_time": time(20, 0),
    },
    {
        "name": "VILNIUS TECH Basketball Community",
        "description": "Student supporter community around the VILNIUS TECH basketball team, bringing volunteers and fans together for games and campus spirit.",
        "category_name": "Sports & Fitness",
        "city": "Vilnius",
        "location": "VILNIUS TECH Sports and Arts Centre",
        "website_url": "https://vilniustech.lt/en/sports-and-arts-centre/leisure/sports-clubs/",
        "meeting_weekday": 4,
        "meeting_start_time": time(17, 30),
        "meeting_end_time": time(19, 0),
    },
    {
        "name": "VILNIUS TECH VELO Club",
        "description": "Cycling club for the university community, connecting students and staff who enjoy rides, active commuting, and cycling culture.",
        "category_name": "Sports & Fitness",
        "city": "Vilnius",
        "location": "VILNIUS TECH campus",
        "website_url": "https://vilniustech.lt/en/sports-and-arts-centre/leisure/sports-clubs/",
        "meeting_weekday": 5,
        "meeting_start_time": time(10, 0),
        "meeting_end_time": time(13, 0),
    },
    {
        "name": "VILNIUS TECH Chess Club",
        "description": "Open student chess club for strategic thinking, concentration, friendly ladder games, and casual tournaments.",
        "category_name": "Hobbies & Lifestyle",
        "city": "Vilnius",
        "location": "VILNIUS TECH Library Commons",
        "website_url": "https://vilniustech.lt/en/sports-and-arts-centre/leisure/sports-clubs/",
        "meeting_weekday": 2,
        "meeting_start_time": time(18, 0),
        "meeting_end_time": time(20, 0),
    },
    {
        "name": "VU Cultural Center Art Groups",
        "description": "Vilnius University cultural community for choirs, art groups, creative projects, concerts, performances, and student cultural volunteering.",
        "category_name": "Arts & Culture",
        "city": "Vilnius",
        "location": "Vilnius University Cultural Center",
        "website_url": "https://www.vu.lt/en/university/student-life",
        "meeting_weekday": 2,
        "meeting_start_time": time(18, 0),
        "meeting_end_time": time(20, 30),
    },
    {
        "name": "VU Debate Society",
        "description": "Vilnius University debate community for students who want to practice argumentation, public speaking, and civic discussion.",
        "category_name": "Social & Community",
        "city": "Vilnius",
        "location": "Vilnius University",
        "website_url": "https://www.vu.lt/en/all-news/looking-for-a-sense-of-belonging-vu-invites-you-to-discover-your-community-through-student-organisations-and-activities",
        "meeting_weekday": 1,
        "meeting_start_time": time(18, 0),
        "meeting_end_time": time(20, 0),
    },
    {
        "name": "VU Students' Scientific Societies",
        "description": "Academic student societies at Vilnius University for research-minded students, scientific groups, poster sessions, and faculty-level projects.",
        "category_name": "STEM & Technology",
        "city": "Vilnius",
        "location": "Vilnius University faculties",
        "website_url": "https://www.vu.lt/en/university/student-life",
        "meeting_weekday": 3,
        "meeting_start_time": time(17, 30),
        "meeting_end_time": time(19, 30),
    },
    {
        "name": "VMU Japanese Club Hashi",
        "description": "Vytautas Magnus University student club for Japanese culture, language practice, cultural evenings, and community activities.",
        "category_name": "Hobbies & Lifestyle",
        "city": "Kaunas",
        "location": "Vytautas Magnus University",
        "website_url": "https://www.vdu.lt/en/about-vmu/structure-and-management-of-vmu/academic-and-student-clubs/",
        "meeting_weekday": 4,
        "meeting_start_time": time(17, 0),
        "meeting_end_time": time(19, 0),
    },
    {
        "name": "VMU Modusas Nature Club",
        "description": "Vytautas Magnus University nature club for students interested in ecology, biodiversity, nature observation, and outdoor learning.",
        "category_name": "Hobbies & Lifestyle",
        "city": "Kaunas",
        "location": "Vytautas Magnus University",
        "website_url": "https://www.vdu.lt/en/about-vmu/structure-and-management-of-vmu/academic-and-student-clubs/",
        "meeting_weekday": 5,
        "meeting_start_time": time(9, 30),
        "meeting_end_time": time(12, 30),
    },
    {
        "name": "VMU Vesta Social Welfare Club",
        "description": "Vytautas Magnus University social welfare club for students interested in social support, volunteering, and community wellbeing.",
        "category_name": "Social & Community",
        "city": "Kaunas",
        "location": "Vytautas Magnus University",
        "website_url": "https://www.vdu.lt/en/about-vmu/structure-and-management-of-vmu/academic-and-student-clubs/",
        "meeting_weekday": 2,
        "meeting_start_time": time(17, 30),
        "meeting_end_time": time(19, 0),
    },
    {
        "name": "VMU Lithuanian United Nations Youth Association",
        "description": "Civil society and human rights student organisation focused on tolerance, civic action, international topics, and Model UN style activities.",
        "category_name": "Social & Community",
        "city": "Kaunas",
        "location": "Vytautas Magnus University",
        "website_url": "https://www.vdu.lt/en/about-vmu/structure-and-management-of-vmu/academic-and-student-clubs/",
        "meeting_weekday": 0,
        "meeting_start_time": time(18, 0),
        "meeting_end_time": time(20, 0),
    },
    {
        "name": "Klaipeda University Student Union",
        "description": "Klaipeda University student union, commonly known as KUSS, fostering student unity, culture, community life, and student initiatives.",
        "category_name": "Social & Community",
        "city": "Klaipeda",
        "location": "Klaipeda University",
        "website_url": "https://www.ku.lt/en/university/campus-life",
        "meeting_weekday": 1,
        "meeting_start_time": time(17, 30),
        "meeting_end_time": time(19, 30),
    },
    {
        "name": "Klaipeda University Sports Club",
        "description": "Klaipeda University sports club developing and popularising sport among students and staff through basketball, football, volleyball, table tennis, and training groups.",
        "category_name": "Sports & Fitness",
        "city": "Klaipeda",
        "location": "Klaipeda University Sports Centre",
        "website_url": "https://www.jti.web.ku.lt/en/centres-1/sports-centre/sports-club",
        "meeting_weekday": 2,
        "meeting_start_time": time(18, 0),
        "meeting_end_time": time(20, 0),
    },
    {
        "name": "Klaipeda University Mixed Choir Pajurio aidos",
        "description": "Klaipeda University mixed choir for students who want to sing, perform, and join the university's cultural community.",
        "category_name": "Arts & Culture",
        "city": "Klaipeda",
        "location": "Klaipeda University",
        "website_url": "https://www.ku.lt/en/university/campus-life",
        "meeting_weekday": 3,
        "meeting_start_time": time(18, 0),
        "meeting_end_time": time(20, 0),
    },
    {
        "name": "Klaipeda University Student Theatre",
        "description": "Klaipeda University student theatre group for acting, improvisation, performance practice, and campus cultural events.",
        "category_name": "Arts & Culture",
        "city": "Klaipeda",
        "location": "Klaipeda University",
        "website_url": "https://www.ku.lt/en/university/campus-life",
        "meeting_weekday": 4,
        "meeting_start_time": time(17, 30),
        "meeting_end_time": time(20, 0),
    },
]


CLUB_INTERESTS: dict[str, list[str]] = {
    "Vilnius Tech Runners": ["Running & Athletics", "Gym & Fitness", "Outdoor Hiking", "Wellness & Mental Health"],
    "Code & Coffee Society": ["Programming & Coding", "Data Science & AI", "Cybersecurity", "Entrepreneurship"],
    "Campus Creative Collective": ["Visual Arts", "Photography", "Design & Illustration", "Creative Writing"],
    "Student Volunteer Network": ["Volunteering", "Mentoring", "Sustainability", "Inclusion & Accessibility"],
    "Board Game Evenings": ["Board Games", "Chess & Strategy", "Casual Socials", "Social Events"],
    "Kaunas University of Technology Students' Association": ["Leadership & Representation", "Student Union & Politics", "Social Events", "Mentoring"],
    "KTU Aurochs Engineering Club": ["Civil Engineering", "Robotics & Engineering", "Electronics & Makerspaces", "Science & Research"],
    "VU Students' Representation": ["Leadership & Representation", "Student Union & Politics", "Inclusion & Accessibility", "Social Events"],
    "ESN VMU Kaunas": ["International Student Support", "Language Exchange", "Volunteering", "Cultural Heritage"],
    "LSMU Student Union": ["Leadership & Representation", "Mentoring", "Inclusion & Accessibility", "Volunteering"],
    "ESN LSMU": ["International Student Support", "Language Exchange", "Volunteering", "Casual Socials"],
    "VILNIUS TECH Sports and Arts Centre": ["Basketball", "Volleyball", "Gym & Fitness", "Dance & Performance"],
    "VILNIUS TECH Art Groups": ["Choir & Vocal Music", "Theatre & Drama", "Dance & Performance", "Cultural Heritage"],
    "ISM Investment Club": ["Finance & Investing", "Entrepreneurship", "Data Science & AI", "Science & Research"],
    "ISM Dance Club": ["Dance & Performance", "Dance Fitness", "Casual Socials", "Social Events"],
    "KTU Sports Teams": ["Basketball", "Volleyball", "Football", "Running & Athletics"],
    "VILNIUS TECH Tourism Club": ["Outdoor Hiking", "Travel & Outdoors", "Nature & Biodiversity", "Cycling"],
    "VILNIUS TECH Basketball Community": ["Basketball", "Volunteering", "Leadership & Representation", "Casual Socials"],
    "VILNIUS TECH VELO Club": ["Cycling", "Outdoor Hiking", "Travel & Outdoors", "Wellness & Mental Health"],
    "VILNIUS TECH Chess Club": ["Chess & Strategy", "Board Games", "Casual Socials"],
    "VU Cultural Center Art Groups": ["Choir & Vocal Music", "Music & Bands", "Theatre & Drama", "Dance & Performance", "Creative Writing"],
    "VU Debate Society": ["Debate & Public Speaking", "Human Rights & Civic Action", "Leadership & Representation"],
    "VU Students' Scientific Societies": ["Science & Research", "Data Science & AI", "Mathematics", "Programming & Coding"],
    "VMU Japanese Club Hashi": ["Japanese Culture", "Language Exchange", "Cultural Heritage", "Food & Cooking"],
    "VMU Modusas Nature Club": ["Nature & Biodiversity", "Outdoor Hiking", "Sustainability", "Travel & Outdoors"],
    "VMU Vesta Social Welfare Club": ["Volunteering", "Mentoring", "Inclusion & Accessibility", "Wellness & Mental Health"],
    "VMU Lithuanian United Nations Youth Association": ["Human Rights & Civic Action", "Debate & Public Speaking", "International Student Support", "Volunteering"],
    "Klaipeda University Student Union": ["Leadership & Representation", "Social Events", "Mentoring", "Cultural Heritage"],
    "Klaipeda University Sports Club": ["Basketball", "Football", "Volleyball", "Gym & Fitness"],
    "Klaipeda University Mixed Choir Pajurio aidos": ["Choir & Vocal Music", "Music & Bands", "Cultural Heritage"],
    "Klaipeda University Student Theatre": ["Theatre & Drama", "Dance & Performance", "Creative Writing"],
}


EVENT_TITLES: list[str] = [
    "Public Speaking Lab: Debate Motions Night",
    "VU Open Rehearsal: Choir, Theatre, and Dance",
    "KTU Interfaculty Volleyball Friendly",
    "Tourism Club Hiking Safety Briefing",
    "Student Research Poster Sprint",
    "Japanese Culture Evening: Language, Games, and Tea",
    "Campus Biodiversity Walk",
    "Peer Support Volunteer Training",
    "Model UN Crisis Simulation",
    "Seaside Freshers Community Picnic",
    "Klaipeda Student Basketball Open Practice",
    "Open Choir Rehearsal by the Sea",
    "Student Theatre Improv Workshop",
    "Rapid Chess Ladder Night",
    "Campus-to-Green-Lakes Cycling Ride",
    "Steel Bridge Design Review",
]


EVENT_ROWS: list[dict] = [
    {
        "title": "Public Speaking Lab: Debate Motions Night",
        "description": "A beginner-friendly debate practice with prepared motions, short speeches, and peer feedback on argument structure.",
        "category_name": "Social & Community",
        "club_name": "VU Debate Society",
        "start_time": datetime(2026, 5, 18, 15, 0, tzinfo=timezone.utc),
        "end_time": datetime(2026, 5, 18, 17, 0, tzinfo=timezone.utc),
        "city": "Vilnius",
        "location": "VU Central Campus seminar room",
    },
    {
        "title": "VU Open Rehearsal: Choir, Theatre, and Dance",
        "description": "Open rehearsal evening where students can try choir warmups, theatre exercises, and dance group introductions.",
        "category_name": "Arts & Culture",
        "club_name": "VU Cultural Center Art Groups",
        "start_time": datetime(2026, 5, 20, 15, 30, tzinfo=timezone.utc),
        "end_time": datetime(2026, 5, 20, 18, 0, tzinfo=timezone.utc),
        "city": "Vilnius",
        "location": "Vilnius University Cultural Center",
    },
    {
        "title": "KTU Interfaculty Volleyball Friendly",
        "description": "Mixed student teams play short volleyball matches with sports centre coaches helping new players join safely.",
        "category_name": "Sports & Fitness",
        "club_name": "KTU Sports Teams",
        "start_time": datetime(2026, 5, 22, 14, 30, tzinfo=timezone.utc),
        "end_time": datetime(2026, 5, 22, 17, 0, tzinfo=timezone.utc),
        "city": "Kaunas",
        "location": "KTU Sports and Wellness Centre",
    },
    {
        "title": "Tourism Club Hiking Safety Briefing",
        "description": "A practical session on route planning, packing, first-aid basics, and joining the next student hiking trip.",
        "category_name": "Sports & Fitness",
        "club_name": "VILNIUS TECH Tourism Club",
        "start_time": datetime(2026, 5, 23, 8, 0, tzinfo=timezone.utc),
        "end_time": datetime(2026, 5, 23, 10, 0, tzinfo=timezone.utc),
        "city": "Vilnius",
        "location": "VILNIUS TECH Sports and Arts Centre",
    },
    {
        "title": "Student Research Poster Sprint",
        "description": "Research-minded students turn a project idea into a clear poster and practice explaining it to a non-specialist audience.",
        "category_name": "STEM & Technology",
        "club_name": "VU Students' Scientific Societies",
        "start_time": datetime(2026, 5, 26, 13, 0, tzinfo=timezone.utc),
        "end_time": datetime(2026, 5, 26, 16, 0, tzinfo=timezone.utc),
        "city": "Vilnius",
        "location": "VU Faculty study space",
    },
    {
        "title": "Japanese Culture Evening: Language, Games, and Tea",
        "description": "A relaxed VMU Hashi evening with language practice, cultural games, tea, and a quick introduction for new members.",
        "category_name": "Hobbies & Lifestyle",
        "club_name": "VMU Japanese Club Hashi",
        "start_time": datetime(2026, 5, 30, 14, 0, tzinfo=timezone.utc),
        "end_time": datetime(2026, 5, 30, 17, 0, tzinfo=timezone.utc),
        "city": "Kaunas",
        "location": "VMU student lounge",
    },
    {
        "title": "Campus Biodiversity Walk",
        "description": "Nature club members map plants and pollinators around campus, then collect ideas for a small sustainability project.",
        "category_name": "Hobbies & Lifestyle",
        "club_name": "VMU Modusas Nature Club",
        "start_time": datetime(2026, 6, 3, 13, 30, tzinfo=timezone.utc),
        "end_time": datetime(2026, 6, 3, 16, 0, tzinfo=timezone.utc),
        "city": "Kaunas",
        "location": "VMU campus courtyard",
    },
    {
        "title": "Peer Support Volunteer Training",
        "description": "Students learn listening basics, referral boundaries, and how to support classmates through student welfare initiatives.",
        "category_name": "Social & Community",
        "club_name": "VMU Vesta Social Welfare Club",
        "start_time": datetime(2026, 6, 4, 14, 0, tzinfo=timezone.utc),
        "end_time": datetime(2026, 6, 4, 17, 0, tzinfo=timezone.utc),
        "city": "Kaunas",
        "location": "VMU social sciences classroom",
    },
    {
        "title": "Model UN Crisis Simulation",
        "description": "A student-led crisis simulation for practicing diplomacy, public speaking, negotiation, and human rights discussion.",
        "category_name": "Social & Community",
        "club_name": "VMU Lithuanian United Nations Youth Association",
        "start_time": datetime(2026, 6, 6, 9, 0, tzinfo=timezone.utc),
        "end_time": datetime(2026, 6, 6, 14, 0, tzinfo=timezone.utc),
        "city": "Kaunas",
        "location": "VMU conference hall",
    },
    {
        "title": "Seaside Freshers Community Picnic",
        "description": "KUSS hosts a relaxed picnic for new and current students with club tables, games, and ways to volunteer on campus.",
        "category_name": "Social & Community",
        "club_name": "Klaipeda University Student Union",
        "start_time": datetime(2026, 6, 12, 13, 0, tzinfo=timezone.utc),
        "end_time": datetime(2026, 6, 12, 17, 0, tzinfo=timezone.utc),
        "city": "Klaipeda",
        "location": "Klaipeda University courtyard",
    },
    {
        "title": "Klaipeda Student Basketball Open Practice",
        "description": "Open practice for students interested in basketball, with coach introductions and friendly scrimmages by ability level.",
        "category_name": "Sports & Fitness",
        "club_name": "Klaipeda University Sports Club",
        "start_time": datetime(2026, 6, 14, 9, 0, tzinfo=timezone.utc),
        "end_time": datetime(2026, 6, 14, 11, 0, tzinfo=timezone.utc),
        "city": "Klaipeda",
        "location": "Klaipeda University sports hall",
    },
    {
        "title": "Open Choir Rehearsal by the Sea",
        "description": "Pajurio aidos invites students to try vocal warmups, learn a short piece, and meet choir members before summer performances.",
        "category_name": "Arts & Culture",
        "club_name": "Klaipeda University Mixed Choir Pajurio aidos",
        "start_time": datetime(2026, 6, 18, 15, 0, tzinfo=timezone.utc),
        "end_time": datetime(2026, 6, 18, 17, 0, tzinfo=timezone.utc),
        "city": "Klaipeda",
        "location": "Klaipeda University music room",
    },
    {
        "title": "Student Theatre Improv Workshop",
        "description": "A no-pressure theatre session with warmups, short improv games, and information about joining the student theatre group.",
        "category_name": "Arts & Culture",
        "club_name": "Klaipeda University Student Theatre",
        "start_time": datetime(2026, 6, 19, 14, 30, tzinfo=timezone.utc),
        "end_time": datetime(2026, 6, 19, 17, 0, tzinfo=timezone.utc),
        "city": "Klaipeda",
        "location": "Klaipeda University black box room",
    },
    {
        "title": "Rapid Chess Ladder Night",
        "description": "Quick chess games, casual coaching, and a friendly ladder format for students who want strategic but low-pressure competition.",
        "category_name": "Hobbies & Lifestyle",
        "club_name": "VILNIUS TECH Chess Club",
        "start_time": datetime(2026, 6, 25, 15, 0, tzinfo=timezone.utc),
        "end_time": datetime(2026, 6, 25, 18, 0, tzinfo=timezone.utc),
        "city": "Vilnius",
        "location": "VILNIUS TECH Library Commons",
    },
    {
        "title": "Campus-to-Green-Lakes Cycling Ride",
        "description": "A social student ride with route safety notes, regroup stops, and a beginner-friendly pace out toward the Green Lakes.",
        "category_name": "Sports & Fitness",
        "club_name": "VILNIUS TECH VELO Club",
        "start_time": datetime(2026, 7, 4, 7, 30, tzinfo=timezone.utc),
        "end_time": datetime(2026, 7, 4, 11, 30, tzinfo=timezone.utc),
        "city": "Vilnius",
        "location": "VILNIUS TECH central campus",
    },
    {
        "title": "Steel Bridge Design Review",
        "description": "KTU Aurochs members review bridge concepts, load paths, and fabrication tasks before the next student engineering milestone.",
        "category_name": "STEM & Technology",
        "club_name": "KTU Aurochs Engineering Club",
        "start_time": datetime(2026, 7, 10, 13, 0, tzinfo=timezone.utc),
        "end_time": datetime(2026, 7, 10, 16, 0, tzinfo=timezone.utc),
        "city": "Kaunas",
        "location": "KTU Faculty of Mechanical Engineering and Design",
    },
]


EVENT_LINK_UPDATES: list[tuple[str, str, str]] = [
    ("Basketball 3x3 Friendly Tournament", "VILNIUS TECH Basketball Community", "Sports & Fitness"),
    ("Dance Taster: Salsa for Complete Beginners", "ISM Dance Club", "Hobbies & Lifestyle"),
    ("Campus Summer Kickoff Fair", "VU Students' Representation", "Social & Community"),
    ("Design Jam: Poster Night for Clubs", "VU Cultural Center Art Groups", "Arts & Culture"),
    ("Online Exam Prep Accountability Room", "Student Volunteer Network", "Social & Community"),
]


def _category_ids(conn) -> dict[str, uuid.UUID]:
    result = conn.execute(sa.text("SELECT id, name FROM interest_categories"))
    return {row.name: row.id for row in result}


def _interest_ids(conn, names: list[str] | None = None) -> dict[str, uuid.UUID]:
    if names:
        result = conn.execute(
            sa.text("SELECT id, name FROM interests WHERE name IN :names").bindparams(
                sa.bindparam("names", expanding=True)
            ),
            {"names": names},
        )
    else:
        result = conn.execute(sa.text("SELECT id, name FROM interests"))
    return {row.name: row.id for row in result}


def _club_ids(conn, names: list[str] | None = None) -> dict[str, uuid.UUID]:
    if names:
        result = conn.execute(
            sa.text("SELECT id, name FROM clubs WHERE name IN :names").bindparams(
                sa.bindparam("names", expanding=True)
            ),
            {"names": names},
        )
    else:
        result = conn.execute(sa.text("SELECT id, name FROM clubs"))
    return {row.name: row.id for row in result}


def upgrade() -> None:
    op.create_table(
        "club_interests",
        sa.Column("club_id", sa.UUID(), nullable=False),
        sa.Column("interest_id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["club_id"], ["clubs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["interest_id"], ["interests.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("club_id", "interest_id"),
    )

    conn = op.get_bind()
    category_ids = _category_ids(conn)

    interest_rows: list[dict] = []
    for category_name, items in INTERESTS_BY_CATEGORY.items():
        category_id = category_ids.get(category_name)
        if not category_id:
            continue
        for name, description in items:
            interest_rows.append(
                {
                    "id": uuid.uuid4(),
                    "category_id": category_id,
                    "name": name,
                    "description": description,
                }
            )

    interest_names = [row["name"] for row in interest_rows]
    existing_interest_names = set(_interest_ids(conn, interest_names).keys())
    interests = sa.table(
        "interests",
        sa.column("id", sa.UUID),
        sa.column("category_id", sa.UUID),
        sa.column("name", sa.String),
        sa.column("description", sa.String),
    )
    new_interest_rows = [
        row for row in interest_rows if row["name"] not in existing_interest_names
    ]
    if new_interest_rows:
        op.bulk_insert(interests, new_interest_rows)

    club_names = [row["name"] for row in CLUB_ROWS]
    existing_club_names = set(_club_ids(conn, club_names).keys())
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
        sa.column("meeting_weekday", sa.Integer),
        sa.column("meeting_start_time", sa.Time),
        sa.column("meeting_end_time", sa.Time),
    )
    club_rows = [
        {
            "id": uuid.uuid4(),
            "name": row["name"],
            "description": row["description"],
            "category_id": category_ids.get(row["category_name"]),
            "city": row["city"],
            "location": row["location"],
            "website_url": row["website_url"],
            "is_active": True,
            "meeting_weekday": row["meeting_weekday"],
            "meeting_start_time": row["meeting_start_time"],
            "meeting_end_time": row["meeting_end_time"],
        }
        for row in CLUB_ROWS
        if row["name"] not in existing_club_names
    ]
    if club_rows:
        op.bulk_insert(clubs, club_rows)

    club_ids = _club_ids(conn)
    all_interest_names = sorted({name for names in CLUB_INTERESTS.values() for name in names})
    interest_ids = _interest_ids(conn, all_interest_names)

    existing_links = {
        (row.club_name, row.interest_name)
        for row in conn.execute(
            sa.text(
                """
                SELECT c.name AS club_name, i.name AS interest_name
                FROM club_interests ci
                JOIN clubs c ON c.id = ci.club_id
                JOIN interests i ON i.id = ci.interest_id
                """
            )
        )
    }
    club_interests = sa.table(
        "club_interests",
        sa.column("club_id", sa.UUID),
        sa.column("interest_id", sa.UUID),
    )
    link_rows: list[dict] = []
    for club_name, interest_names_for_club in CLUB_INTERESTS.items():
        club_id = club_ids.get(club_name)
        if not club_id:
            continue
        for interest_name in interest_names_for_club:
            interest_id = interest_ids.get(interest_name)
            if not interest_id or (club_name, interest_name) in existing_links:
                continue
            link_rows.append({"club_id": club_id, "interest_id": interest_id})
    if link_rows:
        op.bulk_insert(club_interests, link_rows)

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

    existing_event_titles = {
        row.title
        for row in conn.execute(
            sa.text("SELECT title FROM events WHERE title IN :titles").bindparams(
                sa.bindparam("titles", expanding=True)
            ),
            {"titles": EVENT_TITLES},
        )
    }
    event_rows = []
    for row in EVENT_ROWS:
        if row["title"] in existing_event_titles:
            continue
        event_rows.append(
            {
                "id": uuid.uuid4(),
                "title": row["title"],
                "description": row["description"],
                "category_id": category_ids.get(row["category_name"]),
                "club_id": club_ids.get(row["club_name"]),
                "start_time": row["start_time"],
                "end_time": row["end_time"],
                "city": row["city"],
                "location": row["location"],
                "is_active": True,
                "is_online": False,
                "registration_url": None,
                "image_url": None,
            }
        )
    if event_rows:
        op.bulk_insert(events, event_rows)

    update_event = sa.text(
        """
        UPDATE events
        SET club_id = :club_id,
            category_id = :category_id
        WHERE title = :title
        """
    )
    for title, club_name, category_name in EVENT_LINK_UPDATES:
        club_id = club_ids.get(club_name)
        category_id = category_ids.get(category_name)
        if not club_id or not category_id:
            continue
        conn.execute(
            update_event,
            {"title": title, "club_id": club_id, "category_id": category_id},
        )


def downgrade() -> None:
    conn = op.get_bind()

    op.drop_table("club_interests")

    conn.execute(
        sa.text("DELETE FROM events WHERE title IN :titles").bindparams(
            sa.bindparam("titles", expanding=True)
        ),
        {"titles": EVENT_TITLES},
    )
    conn.execute(
        sa.text("UPDATE events SET club_id = NULL WHERE title IN :titles").bindparams(
            sa.bindparam("titles", expanding=True)
        ),
        {"titles": [title for title, _, _ in EVENT_LINK_UPDATES]},
    )
    conn.execute(
        sa.text("DELETE FROM clubs WHERE name IN :names").bindparams(
            sa.bindparam("names", expanding=True)
        ),
        {"names": [row["name"] for row in CLUB_ROWS]},
    )
    conn.execute(
        sa.text("DELETE FROM interests WHERE name IN :names").bindparams(
            sa.bindparam("names", expanding=True)
        ),
        {"names": [name for items in INTERESTS_BY_CATEGORY.values() for name, _ in items]},
    )
