"""seed Lizdas Sound Institute @ Kavine Kultura event

Adds an upcoming community music event hosted at Kavinė Kultūra in Kaunas
(Kauno paveikslų galerijos kiemelis), curated by Lizdas Sound Institute together
with Kaunas Jazz. Sourced from the Instagram post linked in `registration_url`,
with `image_url` pointing at the post's cover image.

Revision ID: seed_lizdas_kavine_kultura_event
Revises: seed_kaveikti_kaunas_events
Create Date: 2026-04-23

"""
from datetime import datetime, timezone
from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa


revision: str = "seed_lizdas_kavine_kultura_event"
down_revision: Union[str, Sequence[str], None] = "seed_kaveikti_kaunas_events"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


EVENT_TITLE = "Lizdas Sound Institute × Kaunas Jazz @ Kavinė Kultūra"

EVENT_DESCRIPTION = (
    "Ne paslaptis, kad bene visi keliai Kaune veda į Kavinę Kultūrą. "
    "Ypatingai tuomet, kai miestą užlieja Kaunas Jazz Festivalio garsai – atrodo, "
    "kojos pačios nuveda į Kauno paveikslų galerijos kiemelį aptarti potyrius. "
    "Artimiausias kiek ryškesnis toks nutikimas nusimato ateinantį šeštadienį – "
    "tą vakarą muzikinį takelį tenais kuruojame mes, drauge su Kaunas Jazz.\n\n"
    "Pradžia – 18:00, o muzikuosime iki pat 22:00 (po to kelsimės į klubą). "
    "Tad, užsukite atsigaivinti, pasigėrėti gražiomis selekcijomis ir gražiais žmonėmis. "
    "Nemokama ir atvira visiems.\n\n"
    "Šaltinis: Instagram @lizdas.sound.institute."
)

# Saturday 25 April 2026, 18:00–22:00 Europe/Vilnius (EEST = UTC+3).
EVENT_START_UTC = datetime(2026, 4, 25, 15, 0, tzinfo=timezone.utc)
EVENT_END_UTC = datetime(2026, 4, 25, 19, 0, tzinfo=timezone.utc)

EVENT_CITY = "Kaunas"
EVENT_LOCATION = "Kavinė Kultūra (Kauno paveikslų galerijos kiemelis)"
EVENT_REGISTRATION_URL = (
    "https://www.instagram.com/lizdas.sound.institute/p/DXZdHRpiEB9/"
)
EVENT_IMAGE_URL = (
    "https://instagram.fkun1-1.fna.fbcdn.net/v/t51.82787-15/"
    "674378374_18547877923067803_8383821459444078148_n.jpg"
    "?stp=dst-jpg_e35_tt6&_nc_cat=107"
    "&ig_cache_key=Mzg4MDI1OTgwMzUzNjcwNDQ1OA%3D%3D.3-ccb7-5"
    "&ccb=7-5&_nc_sid=58cdad"
    "&efg=eyJ2ZW5jb2RlX3RhZyI6InhwaWRzLjE0NDB4MTc4Ny5zZHIuQzMifQ%3D%3D"
    "&_nc_ohc=9zMaiBYU1isQ7kNvwG2RjyY"
    "&_nc_oc=AdqD0SGZWzxIwyjCzkx9cSQ2IdKULlwd5WMl2SvlKGSTTzASDbpeAoDSZjEaN8_6l0CeKu8l4H8kBtM9P83vqAXV"
    "&_nc_ad=z-m&_nc_cid=1034&_nc_zt=23&_nc_ht=instagram.fkun1-1.fna"
    "&_nc_gid=DIZTKxlhjw2cR4nX6coRAw&_nc_ss=7a22e"
    "&oh=00_Af2c3YRpvZT8kt7iR4SZFYyvze-X9gfV3Vyoy9GGz-o8dQ&oe=69EFC34E"
)


def _arts_category_id(conn) -> uuid.UUID | None:
    row = conn.execute(
        sa.text("SELECT id FROM interest_categories WHERE name = :name LIMIT 1"),
        {"name": "Arts & Culture"},
    ).fetchone()
    return row[0] if row else None


def upgrade() -> None:
    conn = op.get_bind()

    existing = conn.execute(
        sa.text(
            "SELECT id FROM events WHERE title = :title AND start_time = :start_time"
        ),
        {"title": EVENT_TITLE, "start_time": EVENT_START_UTC},
    ).fetchone()
    if existing:
        return

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

    op.bulk_insert(
        events,
        [
            {
                "id": uuid.uuid4(),
                "title": EVENT_TITLE,
                "description": EVENT_DESCRIPTION,
                "category_id": _arts_category_id(conn),
                "club_id": None,
                "start_time": EVENT_START_UTC,
                "end_time": EVENT_END_UTC,
                "city": EVENT_CITY,
                "location": EVENT_LOCATION,
                "is_active": True,
                "is_online": False,
                "registration_url": EVENT_REGISTRATION_URL,
                "image_url": EVENT_IMAGE_URL,
            }
        ],
    )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            "DELETE FROM events WHERE title = :title AND start_time = :start_time"
        ),
        {"title": EVENT_TITLE, "start_time": EVENT_START_UTC},
    )
