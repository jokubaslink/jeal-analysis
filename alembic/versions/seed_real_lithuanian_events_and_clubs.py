"""seed real Lithuanian events and clubs

Revision ID: seed_real_lt_events_clubs
Revises: seed_rich_demo_events
Create Date: 2026-05-04

Adds sourced university clubs/organisations and real 2026 event listings from
official university and conference websites. URLs are stored in website_url or
registration_url so demo data can be traced back to its source.
"""
from datetime import datetime, timezone
from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa


revision: str = "seed_real_lt_events_clubs"
down_revision: Union[str, Sequence[str], None] = "seed_rich_demo_events"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


CLUB_NAMES: list[str] = [
    "Kaunas University of Technology Students' Association",
    "KTU Aurochs Engineering Club",
    "VU Students' Representation",
    "ESN VMU Kaunas",
    "LSMU Student Union",
    "ESN LSMU",
    "VILNIUS TECH Sports and Arts Centre",
    "VILNIUS TECH Art Groups",
    "ISM Investment Club",
    "ISM Dance Club",
]


EVENT_TITLES: list[str] = [
    "ICAReAlumni Conference 2026",
    "VMU Student Conference Freedom to Create",
    "LSMU Staff Week 2026",
    "Information Society and University Studies IVUS 2026",
    "VILNIUS TECH Sustainability to Funded Innovation Matchmaking",
    "IEEE Authorship and Open Access Symposium",
    "International Young Researchers Conference Industrial Engineering 2026",
    "VILNIUS TECH Business and Management 2026",
    "Mathematics and Natural Sciences: Theory and Application 2026",
    "Mechanika 2026",
    "LSMU Online Open Day - May 2026",
    "National Conference Soil Improvement",
    "LSMU On-site Open Day - May 2026",
    "Opening of the Faculty of Architecture Final Projects Exhibition",
    "Introduction to Scopus",
    "VILNIUS TECH KIF Diploma Ceremony",
    "National Conference of the Lithuanian Mathematical Society",
    "Unlocking the Power of ScienceDirect",
    "AITU-IUTA World Congress 2026",
    "Mathematics Education Research Group Conference",
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
        sa.text("SELECT id, name FROM clubs WHERE name IN :names").bindparams(
            sa.bindparam("names", expanding=True)
        ),
        {"names": CLUB_NAMES},
    )
    return {row.name: row.id for row in result}


def upgrade() -> None:
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

    sports = category_ids.get("Sports & Fitness")
    arts = category_ids.get("Arts & Culture")
    stem = category_ids.get("STEM & Technology")
    social = category_ids.get("Social & Community")
    hobbies = category_ids.get("Hobbies & Lifestyle")

    club_rows = [
        {
            "id": uuid.uuid4(),
            "name": "Kaunas University of Technology Students' Association",
            "description": "KTU student organisation representing students, supporting study quality and social welfare, and organising student events such as Welcome Week, Naktinis krepsinis, and Metiniai LED'ai.",
            "category_id": social,
            "city": "Kaunas",
            "location": "Kaunas University of Technology",
            "website_url": "https://su.ktu.edu/",
            "is_active": True,
        },
        {
            "id": uuid.uuid4(),
            "name": "KTU Aurochs Engineering Club",
            "description": "KTU engineering club where students design, optimise, and build a steel bridge for the international BRICO competition.",
            "category_id": stem,
            "city": "Kaunas",
            "location": "Studentu g. 56, Kaunas",
            "website_url": "https://students.ktu.edu/ed-programmes/united/aurochs/",
            "is_active": True,
        },
        {
            "id": uuid.uuid4(),
            "name": "VU Students' Representation",
            "description": "Vilnius University student representation, one of Lithuania's oldest and largest student organisations, supporting student interests, culture, and self-expression.",
            "category_id": social,
            "city": "Vilnius",
            "location": "Vilnius University Observatory Courtyard",
            "website_url": "https://www.studentauk.vu.lt/en/student-life",
            "is_active": True,
        },
        {
            "id": uuid.uuid4(),
            "name": "ESN VMU Kaunas",
            "description": "Vytautas Magnus University section of Erasmus Student Network, focused on international student integration, volunteering, and intercultural community activities.",
            "category_id": social,
            "city": "Kaunas",
            "location": "Vytautas Magnus University",
            "website_url": "https://www.vdu.lt/en/about-vmu/structure-and-management-of-vmu/academic-and-student-clubs/esn-vmu/",
            "is_active": True,
        },
        {
            "id": uuid.uuid4(),
            "name": "LSMU Student Union",
            "description": "Independent student organisation representing Lithuanian University of Health Sciences students and supporting study quality, social welfare, and student information.",
            "category_id": social,
            "city": "Kaunas",
            "location": "Mickeviciaus g. 9, Kaunas",
            "website_url": "https://lsmu.lt/en/for-students/studies/student-activities-organizations/student-union-sa/",
            "is_active": True,
        },
        {
            "id": uuid.uuid4(),
            "name": "ESN LSMU",
            "description": "Erasmus Student Network at LSMU, helping international students integrate through cultural, educational, volunteering, and entertainment activities.",
            "category_id": social,
            "city": "Kaunas",
            "location": "Lithuanian University of Health Sciences",
            "website_url": "https://lsmu.lt/en/for-students/studies/student-activities-organizations/erasmus-student-network-ens/",
            "is_active": True,
        },
        {
            "id": uuid.uuid4(),
            "name": "VILNIUS TECH Sports and Arts Centre",
            "description": "VILNIUS TECH centre supporting student sport, artistic groups, training programmes, and university representation in competitions and cultural events.",
            "category_id": sports,
            "city": "Vilnius",
            "location": "VILNIUS TECH",
            "website_url": "https://vilniustech.lt/en/sports-and-arts-centre/art/",
            "is_active": True,
        },
        {
            "id": uuid.uuid4(),
            "name": "VILNIUS TECH Art Groups",
            "description": "University art groups including theatre, choir, and dance traditions where students perform, create, and represent the university.",
            "category_id": arts,
            "city": "Vilnius",
            "location": "VILNIUS TECH",
            "website_url": "https://vilniustech.lt/about-university/clubs-and-societies/8195",
            "is_active": True,
        },
        {
            "id": uuid.uuid4(),
            "name": "ISM Investment Club",
            "description": "Student club at ISM University of Management and Economics for students interested in investing, finance, and markets.",
            "category_id": stem,
            "city": "Vilnius",
            "location": "Gedimino ave. 7, Vilnius",
            "website_url": "https://www.ism.lt/en/student-clubs-and-organizations/",
            "is_active": True,
        },
        {
            "id": uuid.uuid4(),
            "name": "ISM Dance Club",
            "description": "Student dance club at ISM University of Management and Economics, part of the university's student clubs and organisations.",
            "category_id": hobbies,
            "city": "Vilnius",
            "location": "Gedimino ave. 7, Vilnius",
            "website_url": "https://www.ism.lt/en/student-clubs-and-organizations/",
            "is_active": True,
        },
    ]

    existing_club_names = {
        row.name
        for row in conn.execute(
            sa.text("SELECT name FROM clubs WHERE name IN :names").bindparams(
                sa.bindparam("names", expanding=True)
            ),
            {"names": CLUB_NAMES},
        )
    }
    rows_to_insert = [
        row for row in club_rows if row["name"] not in existing_club_names
    ]
    if rows_to_insert:
        op.bulk_insert(clubs, rows_to_insert)

    club_ids = _get_club_ids(conn)

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
    event_rows = [
        {
            "id": uuid.uuid4(),
            "title": "ICAReAlumni Conference 2026",
            "description": "KTU Alumni Association conference in Kaunas for alumni relations, career development, exchange of experience, and professional networking.",
            "category_id": social,
            "club_id": None,
            "start_time": datetime(2026, 5, 7, 6, 0, tzinfo=utc),
            "end_time": datetime(2026, 5, 8, 14, 0, tzinfo=utc),
            "city": "Kaunas",
            "location": "Kaunas University of Technology",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://alumni.ktu.edu/icarealumni-conference-2026/",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "VMU Student Conference Freedom to Create",
            "description": "Vytautas Magnus University student conference encouraging liberal education, creativity, civic reflection, and student ideas in public life.",
            "category_id": arts,
            "club_id": club_ids.get("ESN VMU Kaunas"),
            "start_time": datetime(2026, 5, 8, 7, 0, tzinfo=utc),
            "end_time": datetime(2026, 5, 8, 15, 0, tzinfo=utc),
            "city": "Kaunas",
            "location": "Vytautas Magnus University",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://www.vdu.lt/en/freedom-to-create/",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "LSMU Staff Week 2026",
            "description": "International Staff Week at LSMU with presentations, lectures, exchange programme activities, and a look into university life.",
            "category_id": social,
            "club_id": club_ids.get("LSMU Student Union"),
            "start_time": datetime(2026, 5, 11, 6, 0, tzinfo=utc),
            "end_time": datetime(2026, 5, 15, 14, 0, tzinfo=utc),
            "city": "Kaunas",
            "location": "Lithuanian University of Health Sciences",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://lsmu.lt/en/events/lsmu-staff-week-2026/",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "Information Society and University Studies IVUS 2026",
            "description": "Joint conference aimed at master's and PhD students and young scientists sharing research in information society and university studies.",
            "category_id": stem,
            "club_id": None,
            "start_time": datetime(2026, 5, 12, 6, 0, tzinfo=utc),
            "end_time": datetime(2026, 5, 12, 13, 0, tzinfo=utc),
            "city": "Kaunas",
            "location": "KTU, Studentu str. 50, room 106",
            "is_active": True,
            "is_online": True,
            "registration_url": "https://en.ktu.edu/events/information-society-and-university-studies-ivus-2026/",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "VILNIUS TECH Sustainability to Funded Innovation Matchmaking",
            "description": "Interactive matchmaking event for companies, researchers, and innovation actors exploring EU funding and project concepts for the built environment.",
            "category_id": stem,
            "club_id": None,
            "start_time": datetime(2026, 5, 13, 6, 0, tzinfo=utc),
            "end_time": datetime(2026, 5, 13, 14, 0, tzinfo=utc),
            "city": "Vilnius",
            "location": "VILNIUS TECH Sustainability Hub, S4 building, Sauletekio al. 11",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://vilniustech.lt/en/university/events/from-sustainability-to-funded-innovation-matchmaking-for-the-next-generation-of-eu-funded-projects-in-the-built-environment/",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "IEEE Authorship and Open Access Symposium",
            "description": "VILNIUS TECH library webinar with IEEE editors covering authorship, open access, and publishing best practices.",
            "category_id": stem,
            "club_id": None,
            "start_time": datetime(2026, 5, 12, 13, 30, tzinfo=utc),
            "end_time": datetime(2026, 5, 12, 15, 0, tzinfo=utc),
            "city": "Online",
            "location": "IEEE webinar",
            "is_active": True,
            "is_online": True,
            "registration_url": "https://vilniustech.lt/en/university/events/",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "International Young Researchers Conference Industrial Engineering 2026",
            "description": "KTU young researchers conference for research competencies and industrial engineering topics, held in hybrid format.",
            "category_id": stem,
            "club_id": club_ids.get("KTU Aurochs Engineering Club"),
            "start_time": datetime(2026, 5, 14, 6, 0, tzinfo=utc),
            "end_time": datetime(2026, 5, 14, 14, 0, tzinfo=utc),
            "city": "Kaunas",
            "location": "KTU Faculty of Mechanical Engineering and Design, Studentu str. 56",
            "is_active": True,
            "is_online": True,
            "registration_url": "https://en.ktu.edu/events/international-young-researchers-conference-industrial-engineering-2026/",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "VILNIUS TECH Business and Management 2026",
            "description": "International scientific conference in hybrid format with sessions on global shifts, competitiveness, research projects, and networking.",
            "category_id": social,
            "club_id": None,
            "start_time": datetime(2026, 5, 14, 6, 45, tzinfo=utc),
            "end_time": datetime(2026, 5, 15, 12, 0, tzinfo=utc),
            "city": "Vilnius",
            "location": "VILNIUS TECH, Sauletekio Ave. 11",
            "is_active": True,
            "is_online": True,
            "registration_url": "https://conferences.vilniustech.lt/index.php/BM/en/General2026?issueId=1",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "Mathematics and Natural Sciences: Theory and Application 2026",
            "description": "KTU student scientific conference organised by the Faculty of Mathematics and Natural Sciences and FUMSA for students in mathematics, physics, chemistry, and biology.",
            "category_id": stem,
            "club_id": None,
            "start_time": datetime(2026, 5, 15, 6, 0, tzinfo=utc),
            "end_time": datetime(2026, 5, 15, 14, 0, tzinfo=utc),
            "city": "Kaunas",
            "location": "KTU M-Lab, Studentu st. 63a",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://en.ktu.edu/events/the-conference-mathematics-and-natural-sciences-theory-and-application-2026/",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "Mechanika 2026",
            "description": "30th international conference for mechanical engineering and mechatronics research, cooperation, and education trends, held in hybrid format.",
            "category_id": stem,
            "club_id": club_ids.get("KTU Aurochs Engineering Club"),
            "start_time": datetime(2026, 5, 20, 6, 0, tzinfo=utc),
            "end_time": datetime(2026, 5, 21, 14, 0, tzinfo=utc),
            "city": "Kaunas",
            "location": "KTU Faculty of Mechanical Engineering and Design, Studentu St. 56",
            "is_active": True,
            "is_online": True,
            "registration_url": "https://en.ktu.edu/events/30th-international-conference-mechanika-2026/",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "LSMU Online Open Day - May 2026",
            "description": "Online open day for prospective students interested in LSMU studies, facilities, teachers, and practical training opportunities.",
            "category_id": social,
            "club_id": club_ids.get("LSMU Student Union"),
            "start_time": datetime(2026, 5, 27, 12, 0, tzinfo=utc),
            "end_time": datetime(2026, 5, 27, 13, 30, tzinfo=utc),
            "city": "Online",
            "location": "Zoom",
            "is_active": True,
            "is_online": True,
            "registration_url": "https://lsmu.lt/en/events/lsmu-open-days/",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "National Conference Soil Improvement",
            "description": "VILNIUS TECH national conference on soil improvement, listed on the university conferences platform.",
            "category_id": stem,
            "club_id": None,
            "start_time": datetime(2026, 5, 28, 6, 0, tzinfo=utc),
            "end_time": datetime(2026, 5, 28, 14, 0, tzinfo=utc),
            "city": "Vilnius",
            "location": "VILNIUS TECH, Sauletekio av. 11",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://conferences.vilniustech.lt/",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "LSMU On-site Open Day - May 2026",
            "description": "On-site LSMU open day for visitors to meet students and teachers and learn about study programmes and practical training.",
            "category_id": social,
            "club_id": club_ids.get("LSMU Student Union"),
            "start_time": datetime(2026, 5, 29, 7, 0, tzinfo=utc),
            "end_time": datetime(2026, 5, 29, 10, 0, tzinfo=utc),
            "city": "Kaunas",
            "location": "Lithuanian University of Health Sciences",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://lsmu.lt/en/events/lsmu-open-days/",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "Opening of the Faculty of Architecture Final Projects Exhibition",
            "description": "VILNIUS TECH opening event for the Faculty of Architecture final projects exhibition, running through the summer.",
            "category_id": arts,
            "club_id": club_ids.get("VILNIUS TECH Art Groups"),
            "start_time": datetime(2026, 6, 15, 15, 0, tzinfo=utc),
            "end_time": datetime(2026, 6, 15, 17, 0, tzinfo=utc),
            "city": "Vilnius",
            "location": "VILNIUS TECH",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://vilniustech.lt/en/university/events/",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "Introduction to Scopus",
            "description": "VILNIUS TECH webinar presenting Scopus database capabilities for literature discovery and research workflows.",
            "category_id": stem,
            "club_id": None,
            "start_time": datetime(2026, 6, 16, 8, 30, tzinfo=utc),
            "end_time": datetime(2026, 6, 16, 10, 0, tzinfo=utc),
            "city": "Online",
            "location": "Scopus webinar",
            "is_active": True,
            "is_online": True,
            "registration_url": "https://vilniustech.lt/en/university/events/",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "VILNIUS TECH KIF Diploma Ceremony",
            "description": "Diploma ceremony for VILNIUS TECH KIF graduates, family members, and lecturers in Aula Magna.",
            "category_id": social,
            "club_id": None,
            "start_time": datetime(2026, 6, 18, 12, 0, tzinfo=utc),
            "end_time": datetime(2026, 6, 18, 14, 0, tzinfo=utc),
            "city": "Vilnius",
            "location": "VILNIUS TECH Central Building, Aula Magna",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://vilniustech.lt/universitetas/renginiai/kif-diplomu-teikimo-ceremonija/",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "National Conference of the Lithuanian Mathematical Society",
            "description": "67th conference of the Lithuanian Mathematical Society, listed by VILNIUS TECH Conferences.",
            "category_id": stem,
            "club_id": None,
            "start_time": datetime(2026, 6, 25, 6, 0, tzinfo=utc),
            "end_time": datetime(2026, 6, 26, 14, 0, tzinfo=utc),
            "city": "Vilnius",
            "location": "VILNIUS TECH, Sauletekio av. 11",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://conferences.vilniustech.lt/",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "Unlocking the Power of ScienceDirect",
            "description": "VILNIUS TECH Elsevier webinar on finding and working with scientific literature efficiently in ScienceDirect.",
            "category_id": stem,
            "club_id": None,
            "start_time": datetime(2026, 7, 7, 8, 30, tzinfo=utc),
            "end_time": datetime(2026, 7, 7, 10, 0, tzinfo=utc),
            "city": "Online",
            "location": "Elsevier webinar",
            "is_active": True,
            "is_online": True,
            "registration_url": "https://vilniustech.lt/en/university/events/",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "AITU-IUTA World Congress 2026",
            "description": "XIII World Congress of the International University Theatre Association, listed by VILNIUS TECH events.",
            "category_id": arts,
            "club_id": club_ids.get("VILNIUS TECH Art Groups"),
            "start_time": datetime(2026, 7, 8, 6, 0, tzinfo=utc),
            "end_time": datetime(2026, 7, 13, 14, 0, tzinfo=utc),
            "city": "Vilnius",
            "location": "VILNIUS TECH",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://vilniustech.lt/en/university/events/",
            "image_url": None,
        },
        {
            "id": uuid.uuid4(),
            "title": "Mathematics Education Research Group Conference",
            "description": "Conference of the Mathematics education research group of the Lithuanian Mathematics Society, listed by VILNIUS TECH Conferences.",
            "category_id": stem,
            "club_id": None,
            "start_time": datetime(2026, 8, 24, 6, 0, tzinfo=utc),
            "end_time": datetime(2026, 8, 26, 14, 0, tzinfo=utc),
            "city": "Vilnius",
            "location": "Sauletekio av. 11, Vilnius",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://conferences.vilniustech.lt/",
            "image_url": None,
        },
    ]

    existing_event_keys = {
        (row.title, row.start_time)
        for row in conn.execute(
            sa.text(
                "SELECT title, start_time FROM events WHERE title IN :titles"
            ).bindparams(sa.bindparam("titles", expanding=True)),
            {"titles": EVENT_TITLES},
        )
    }
    event_rows_to_insert = [
        row
        for row in event_rows
        if (row["title"], row["start_time"]) not in existing_event_keys
    ]
    if event_rows_to_insert:
        op.bulk_insert(events, event_rows_to_insert)


def downgrade() -> None:
    conn = op.get_bind()

    conn.execute(
        sa.text("DELETE FROM events WHERE title IN :titles").bindparams(
            sa.bindparam("titles", expanding=True)
        ),
        {"titles": EVENT_TITLES},
    )
    conn.execute(
        sa.text("DELETE FROM clubs WHERE name IN :names").bindparams(
            sa.bindparam("names", expanding=True)
        ),
        {"names": CLUB_NAMES},
    )
