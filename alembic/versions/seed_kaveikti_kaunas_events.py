"""seed kaveikti.lt Kaunas events

Revision ID: seed_kaveikti_kaunas_events
Revises: add_is_active_to_events
Create Date: 2026-04-23

Seeds a batch of Kaunas events sourced from https://www.kaveikti.lt/renginiai/kaune
so the recommendations and events endpoints have realistic, locally relevant data
for development and testing.
"""
from datetime import datetime, timezone
from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "seed_kaveikti_kaunas_events"
down_revision: Union[str, Sequence[str], None] = "add_image_url_to_events"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Titles inserted by this migration. Kept as a module-level constant so the
# downgrade can remove exactly the rows we added without touching user data.
EVENT_TITLES: list[str] = [
    "Kauno miesto simfoninio orkestro koncertas-staigmena!",
    "Jaunimo miuziklas „4.62 l dūmų“",
    "Liszt Meets the Queen",
    "HOGAS OPEN 2026 | Finalas",
    "Ilgo formato klubo šou su mini džemu (komedija)",
    "BINGO vakaras „4 metų laikai“ Kaune #6",
    "Tomi Paldanius – akustinės gitaros virtuozas",
    "Šok į tango / Nauja grupė",
    "Muzikinė išpažintis – spektaklis, miuziklas „Pranašas. Kai iš meilės užsidega rankos“",
    "DI versle: kas realiai veikia, o kas tik kainuoja",
    "Seminaras „Česlovo Milošo palikimas ir muzikinės folkloro kultūros atspindžiai“",
    "Paveldas ir vizijos // Aušra Vaitkūnienė",
    "Pavasarinė mugė Pakalnutės žiedas 2026",
    "Soboras. Ekskursija su „katakombų“ lankymu. „Griauti negalima išsaugoti“",
    "Respublikinis vaikų ir jaunimo tautinių šokių festivalis DRAUGAI DRAUGAMS | 2026 • Kaunas",
    "Sporto mokykla „Bangpūtys“ kviečia vaikus susipažinti su irklavimu",
    "„Jaunųjų platforma“: H. Dolinkiewicz ir M. Piotrowicz paroda „Sonarium“",
]


def _get_category_ids(conn) -> dict[str, uuid.UUID]:
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
    """Insert Kaunas events sourced from kaveikti.lt."""
    conn = op.get_bind()
    category_ids = _get_category_ids(conn)

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
    )

    utc = timezone.utc
    arts = category_ids.get("Arts & Culture")
    sports = category_ids.get("Sports & Fitness")
    stem = category_ids.get("STEM & Technology")
    hobbies = category_ids.get("Hobbies & Lifestyle")

    event_rows = [
        {
            "id": uuid.uuid4(),
            "title": "Kauno miesto simfoninio orkestro koncertas-staigmena!",
            "description": (
                "Kauno miesto simfoninio orkestro koncertas-staigmena Kauno "
                "valstybinėje filharmonijoje. Šaltinis: kaveikti.lt."
            ),
            "category_id": arts,
            "club_id": None,
            "start_time": datetime(2026, 4, 24, 18, 0, tzinfo=utc),
            "end_time": datetime(2026, 4, 24, 20, 0, tzinfo=utc),
            "city": "Kaunas",
            "location": "Kauno valstybinė filharmonija",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://www.kaveikti.lt/renginys/kauno-miesto-simfoninio-orkestro-koncertas-staigmena",
        },
        {
            "id": uuid.uuid4(),
            "title": "Jaunimo miuziklas „4.62 l dūmų“",
            "description": (
                "Jaunimo miuziklas „4.62 l dūmų“ LSMU Veterinarijos akademijoje. "
                "Šaltinis: kaveikti.lt."
            ),
            "category_id": arts,
            "club_id": None,
            "start_time": datetime(2026, 4, 23, 18, 0, tzinfo=utc),
            "end_time": datetime(2026, 4, 23, 20, 0, tzinfo=utc),
            "city": "Kaunas",
            "location": "LSMU Veterinarijos akademija",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://www.kaveikti.lt/renginys/jaunimo-miuziklas-4-62-l-dumu",
        },
        {
            "id": uuid.uuid4(),
            "title": "Liszt Meets the Queen",
            "description": (
                "Klasikinės muzikos koncertas „Liszt Meets the Queen“ Kauno "
                "valstybinėje filharmonijoje. Šaltinis: kaveikti.lt."
            ),
            "category_id": arts,
            "club_id": None,
            "start_time": datetime(2026, 4, 23, 18, 0, tzinfo=utc),
            "end_time": datetime(2026, 4, 23, 20, 0, tzinfo=utc),
            "city": "Kaunas",
            "location": "Kauno valstybinė filharmonija",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://www.kaveikti.lt/renginys/liszt-meets-the-queen",
        },
        {
            "id": uuid.uuid4(),
            "title": "HOGAS OPEN 2026 | Finalas",
            "description": (
                "Atlikėjų konkurso „Hogas Open 2026“ finalas Hogas Pub. "
                "Šaltinis: kaveikti.lt."
            ),
            "category_id": arts,
            "club_id": None,
            "start_time": datetime(2026, 4, 23, 19, 0, tzinfo=utc),
            "end_time": datetime(2026, 4, 23, 22, 0, tzinfo=utc),
            "city": "Kaunas",
            "location": "Hogas PUB",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://www.kaveikti.lt/renginys/hogas-open-2026-gyva-atranka-2",
        },
        {
            "id": uuid.uuid4(),
            "title": "Ilgo formato klubo šou su mini džemu (komedija)",
            "description": (
                "Ilgo formato improvizacijos klubo šou su mini džemu „Impro "
                "Kaunas“ teatro salėje. Šaltinis: kaveikti.lt."
            ),
            "category_id": arts,
            "club_id": None,
            "start_time": datetime(2026, 4, 25, 18, 30, tzinfo=utc),
            "end_time": datetime(2026, 4, 25, 20, 30, tzinfo=utc),
            "city": "Kaunas",
            "location": "„Impro Kaunas“ teatro salė",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://www.kaveikti.lt/renginys/ilgo-formato-klubo-sou-su-mini-dzemu-komedija",
        },
        {
            "id": uuid.uuid4(),
            "title": "BINGO vakaras „4 metų laikai“ Kaune #6",
            "description": (
                "Azartiškas BINGO vakaras pramogų erdvėje „4 metų laikai“. "
                "Šaltinis: kaveikti.lt."
            ),
            "category_id": hobbies,
            "club_id": None,
            "start_time": datetime(2026, 4, 30, 19, 0, tzinfo=utc),
            "end_time": datetime(2026, 4, 30, 22, 0, tzinfo=utc),
            "city": "Kaunas",
            "location": "4 metų laikai",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://www.kaveikti.lt/renginys/azartiskas-bingo-vakaras-kaune",
        },
        {
            "id": uuid.uuid4(),
            "title": "Tomi Paldanius – akustinės gitaros virtuozas",
            "description": (
                "Akustinės gitaros virtuozo Tomi Paldanius koncertas Kauno "
                "menininkų namuose. Šaltinis: kaveikti.lt."
            ),
            "category_id": arts,
            "club_id": None,
            "start_time": datetime(2026, 4, 30, 19, 0, tzinfo=utc),
            "end_time": datetime(2026, 4, 30, 21, 0, tzinfo=utc),
            "city": "Kaunas",
            "location": "Kauno menininkų namai",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://www.kaveikti.lt/renginys/tomi-paldanius-akustines-gitaros-virtuozas",
        },
        {
            "id": uuid.uuid4(),
            "title": "Šok į tango / Nauja grupė",
            "description": (
                "Argentinos tango pamokų ciklas pradedantiesiems – nauja grupė "
                "El Tango Club erdvėje. Šaltinis: kaveikti.lt."
            ),
            "category_id": hobbies,
            "club_id": None,
            "start_time": datetime(2026, 5, 6, 19, 0, tzinfo=utc),
            "end_time": datetime(2026, 5, 6, 21, 0, tzinfo=utc),
            "city": "Kaunas",
            "location": "El Tango Club Espacio Cultural",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://www.kaveikti.lt/renginys/argentinos-tango-nauja-grupe-nuo-2025-11-10",
        },
        {
            "id": uuid.uuid4(),
            "title": "Muzikinė išpažintis – spektaklis, miuziklas „Pranašas. Kai iš meilės užsidega rankos“",
            "description": (
                "Muzikinės išpažinties spektaklis-miuziklas „Pranašas. Kai iš "
                "meilės užsidega rankos“ Girstučio rūmuose. Šaltinis: kaveikti.lt."
            ),
            "category_id": arts,
            "club_id": None,
            "start_time": datetime(2026, 5, 20, 18, 0, tzinfo=utc),
            "end_time": datetime(2026, 5, 20, 20, 30, tzinfo=utc),
            "city": "Kaunas",
            "location": "Girstučio rūmai",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://www.kaveikti.lt/renginys/muzikine-ispazintis-spektaklis-miuziklas-pranasas-kai-is-meiles-uzsidega-rankos",
        },
        {
            "id": uuid.uuid4(),
            "title": "DI versle: kas realiai veikia, o kas tik kainuoja",
            "description": (
                "Seminaras apie dirbtinio intelekto naudą versle Teslos salėje, "
                "Jonavos g. 7. Šaltinis: kaveikti.lt."
            ),
            "category_id": stem,
            "club_id": None,
            "start_time": datetime(2026, 4, 23, 10, 0, tzinfo=utc),
            "end_time": datetime(2026, 4, 23, 18, 0, tzinfo=utc),
            "city": "Kaunas",
            "location": "Jonavos g. 7, Teslos salė",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://www.kaveikti.lt/renginys/di-versle-kas-realiai-veikia-o-kas-tik-kainuoja",
        },
        {
            "id": uuid.uuid4(),
            "title": "Seminaras „Česlovo Milošo palikimas ir muzikinės folkloro kultūros atspindžiai“",
            "description": (
                "Seminaras Kauno miesto muziejaus Tautinės muzikos skyriaus "
                "renginių salėje. Šaltinis: kaveikti.lt."
            ),
            "category_id": arts,
            "club_id": None,
            "start_time": datetime(2026, 4, 23, 11, 0, tzinfo=utc),
            "end_time": datetime(2026, 4, 23, 14, 0, tzinfo=utc),
            "city": "Kaunas",
            "location": "Kauno miesto muziejus, L. Zamenhofo g. 4",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://www.kaveikti.lt/renginys/seminaras-ceslovo-miloso-palikimas-ir-muzikines-folkloro-kulturos-atspindziai",
        },
        {
            "id": uuid.uuid4(),
            "title": "Paveldas ir vizijos // Aušra Vaitkūnienė",
            "description": (
                "Aušros Vaitkūnienės paroda „Paveldas ir vizijos“ LDS Kauno "
                "skyriaus galerijoje DROBĖ. Šaltinis: kaveikti.lt."
            ),
            "category_id": arts,
            "club_id": None,
            "start_time": datetime(2026, 4, 23, 10, 0, tzinfo=utc),
            "end_time": datetime(2026, 4, 23, 18, 0, tzinfo=utc),
            "city": "Kaunas",
            "location": "LDS Kauno skyrius / galerija DROBĖ",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://www.kaveikti.lt/renginys/paveldas-ir-vizijos-ausra-vaitkuniene",
        },
        {
            "id": uuid.uuid4(),
            "title": "Pavasarinė mugė Pakalnutės žiedas 2026",
            "description": (
                "Pavasarinė augalų ir amatų mugė „Pakalnutės žiedas 2026“ VDU "
                "Botanikos sode. Šaltinis: kaveikti.lt."
            ),
            "category_id": hobbies,
            "club_id": None,
            "start_time": datetime(2026, 4, 23, 10, 0, tzinfo=utc),
            "end_time": datetime(2026, 4, 23, 17, 0, tzinfo=utc),
            "city": "Kaunas",
            "location": "VDU Botanikos sodas",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://www.kaveikti.lt/renginys/pavasarine-muge-pakalnutes-ziedas-2026",
        },
        {
            "id": uuid.uuid4(),
            "title": "Soboras. Ekskursija su „katakombų“ lankymu. „Griauti negalima išsaugoti“",
            "description": (
                "Ekskursija po Kauno Šv. arkangelo Mykolo (Įgulos) bažnyčią "
                "(Soborą) su „katakombų“ lankymu. Šaltinis: kaveikti.lt."
            ),
            "category_id": arts,
            "club_id": None,
            "start_time": datetime(2026, 4, 23, 12, 45, tzinfo=utc),
            "end_time": datetime(2026, 4, 23, 14, 30, tzinfo=utc),
            "city": "Kaunas",
            "location": "Kauno Šv. arkangelo Mykolo (Įgulos) bažnyčia (Soboras)",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://www.kaveikti.lt/renginys/soboras-ekskursija-su-katakombu-lankymu-griauti-negalima-pasigaileti",
        },
        {
            "id": uuid.uuid4(),
            "title": "Respublikinis vaikų ir jaunimo tautinių šokių festivalis DRAUGAI DRAUGAMS | 2026 • Kaunas",
            "description": (
                "Respublikinis vaikų ir jaunimo tautinių šokių festivalis "
                "„Draugai draugams“ KKC – Kauno kultūros centre. Šaltinis: kaveikti.lt."
            ),
            "category_id": arts,
            "club_id": None,
            "start_time": datetime(2026, 4, 23, 16, 0, tzinfo=utc),
            "end_time": datetime(2026, 4, 23, 19, 0, tzinfo=utc),
            "city": "Kaunas",
            "location": "KKC / Kauno kultūros centras",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://www.kaveikti.lt/renginys/respublikinis-vaiku-ir-jaunimo-tautiniu-sokiu-festivalis-draugai-draugams-2026-kaunas",
        },
        {
            "id": uuid.uuid4(),
            "title": "Sporto mokykla „Bangpūtys“ kviečia vaikus susipažinti su irklavimu",
            "description": (
                "Atvira pažintinė treniruotė vaikams Kauno sporto mokykloje "
                "„Bangpūtys“ – susipažinimas su irklavimu. Šaltinis: kaveikti.lt."
            ),
            "category_id": sports,
            "club_id": None,
            "start_time": datetime(2026, 4, 23, 18, 0, tzinfo=utc),
            "end_time": datetime(2026, 4, 23, 19, 30, tzinfo=utc),
            "city": "Kaunas",
            "location": "Kauno sporto mokykla „Bangpūtys“",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://www.kaveikti.lt/renginys/susipazink-su-irklavimu",
        },
        {
            "id": uuid.uuid4(),
            "title": "„Jaunųjų platforma“: H. Dolinkiewicz ir M. Piotrowicz paroda „Sonarium“",
            "description": (
                "Jaunųjų autorių H. Dolinkiewicz ir M. Piotrowicz paroda "
                "„Sonarium“ Kauno paveikslų galerijoje. Šaltinis: kaveikti.lt."
            ),
            "category_id": arts,
            "club_id": None,
            "start_time": datetime(2026, 4, 23, 18, 0, tzinfo=utc),
            "end_time": datetime(2026, 4, 23, 20, 0, tzinfo=utc),
            "city": "Kaunas",
            "location": "Kauno paveikslų galerija",
            "is_active": True,
            "is_online": False,
            "registration_url": "https://www.kaveikti.lt/renginys/jaunuju-platforma-h-dolinkiewicz-ir-m-piotrowicz-paroda-sonarium",
        },
    ]

    if event_rows:
        op.bulk_insert(events, event_rows)


def downgrade() -> None:
    """Remove the kaveikti.lt Kaunas events inserted by this migration."""
    conn = op.get_bind()
    params = {f"t{i}": title for i, title in enumerate(EVENT_TITLES)}
    placeholders = ", ".join(f":{name}" for name in params)
    conn.execute(
        sa.text(f"DELETE FROM events WHERE title IN ({placeholders})"),
        params,
    )
