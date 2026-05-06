"""add addresses to seeded event and club locations

Revision ID: add_seeded_event_addresses
Revises: seed_club_interest_links
Create Date: 2026-05-06

Adds more specific address-style locations to seeded clubs and events so map
matching and demo browsing have better location data.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_seeded_event_addresses"
down_revision: Union[str, Sequence[str], None] = "seed_club_interest_links"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


CLUB_LOCATION_UPDATES: dict[str, str] = {
    "VU Cultural Center Art Groups": "Vilnius University Cultural Center, M. K. Ciurlionio g. 21, Vilnius",
    "VU Debate Society": "Vilnius University, Universiteto g. 3, Vilnius",
    "VU Students' Scientific Societies": "Vilnius University, Universiteto g. 3, Vilnius",
    "VMU Japanese Club Hashi": "Vytautas Magnus University, K. Donelaicio g. 58, Kaunas",
    "VMU Modusas Nature Club": "Vytautas Magnus University, K. Donelaicio g. 58, Kaunas",
    "VMU Vesta Social Welfare Club": "Vytautas Magnus University, K. Donelaicio g. 58, Kaunas",
    "VMU Lithuanian United Nations Youth Association": "Vytautas Magnus University, K. Donelaicio g. 58, Kaunas",
    "Klaipeda University Student Union": "Klaipeda University, Herkaus Manto g. 84, Klaipeda",
    "Klaipeda University Sports Club": "Klaipeda University Sports Centre, Herkaus Manto g. 84, Klaipeda",
    "Klaipeda University Mixed Choir Pajurio aidos": "Klaipeda University, Herkaus Manto g. 84, Klaipeda",
    "Klaipeda University Student Theatre": "Klaipeda University, Herkaus Manto g. 84, Klaipeda",
    "KTU Sports Teams": "KTU Sports and Wellness Centre, Studentu g. 48, Kaunas",
    "VILNIUS TECH Tourism Club": "VILNIUS TECH Sports and Arts Centre, Sauletekio al. 28, Vilnius",
    "VILNIUS TECH Basketball Community": "VILNIUS TECH Sports and Arts Centre, Sauletekio al. 28, Vilnius",
    "VILNIUS TECH VELO Club": "VILNIUS TECH, Sauletekio al. 11, Vilnius",
    "VILNIUS TECH Chess Club": "VILNIUS TECH Library, Sauletekio al. 14, Vilnius",
}


EVENT_LOCATION_UPDATES: dict[str, str] = {
    "Public Speaking Lab: Debate Motions Night": "Vilnius University, Universiteto g. 3, Vilnius",
    "VU Open Rehearsal: Choir, Theatre, and Dance": "Vilnius University Cultural Center, M. K. Ciurlionio g. 21, Vilnius",
    "KTU Interfaculty Volleyball Friendly": "KTU Sports and Wellness Centre, Studentu g. 48, Kaunas",
    "Tourism Club Hiking Safety Briefing": "VILNIUS TECH Sports and Arts Centre, Sauletekio al. 28, Vilnius",
    "Student Research Poster Sprint": "Vilnius University, Universiteto g. 3, Vilnius",
    "Japanese Culture Evening: Language, Games, and Tea": "Vytautas Magnus University, K. Donelaicio g. 58, Kaunas",
    "Campus Biodiversity Walk": "Vytautas Magnus University, K. Donelaicio g. 58, Kaunas",
    "Peer Support Volunteer Training": "Vytautas Magnus University, K. Donelaicio g. 58, Kaunas",
    "Model UN Crisis Simulation": "Vytautas Magnus University, K. Donelaicio g. 58, Kaunas",
    "Seaside Freshers Community Picnic": "Klaipeda University, Herkaus Manto g. 84, Klaipeda",
    "Klaipeda Student Basketball Open Practice": "Klaipeda University Sports Centre, Herkaus Manto g. 84, Klaipeda",
    "Open Choir Rehearsal by the Sea": "Klaipeda University, Herkaus Manto g. 84, Klaipeda",
    "Student Theatre Improv Workshop": "Klaipeda University, Herkaus Manto g. 84, Klaipeda",
    "Rapid Chess Ladder Night": "VILNIUS TECH Library, Sauletekio al. 14, Vilnius",
    "Campus-to-Green-Lakes Cycling Ride": "VILNIUS TECH, Sauletekio al. 11, Vilnius",
    "Steel Bridge Design Review": "KTU Faculty of Mechanical Engineering and Design, Studentu g. 56, Kaunas",
    "Campus Summer Kickoff Fair": "Vilnius University, Universiteto g. 3, Vilnius",
    "Basketball 3x3 Friendly Tournament": "VILNIUS TECH Sports and Arts Centre, Sauletekio al. 28, Vilnius",
    "Dance Taster: Salsa for Complete Beginners": "ISM University, Gedimino pr. 7, Vilnius",
    "Design Jam: Poster Night for Clubs": "Vilnius University Cultural Center, M. K. Ciurlionio g. 21, Vilnius",
    "Online Exam Prep Accountability Room": "Microsoft Teams",
    "VMU Student Conference Freedom to Create": "Vytautas Magnus University, K. Donelaicio g. 58, Kaunas",
    "ICAReAlumni Conference 2026": "Kaunas University of Technology, K. Donelaicio g. 73, Kaunas",
    "LSMU Staff Week 2026": "Lithuanian University of Health Sciences, A. Mickeviciaus g. 9, Kaunas",
    "LSMU On-site Open Day - May 2026": "Lithuanian University of Health Sciences, A. Mickeviciaus g. 9, Kaunas",
    "Opening of the Faculty of Architecture Final Projects Exhibition": "VILNIUS TECH, Sauletekio al. 11, Vilnius",
    "AITU-IUTA World Congress 2026": "VILNIUS TECH, Sauletekio al. 11, Vilnius",
    "National Conference Soil Improvement": "VILNIUS TECH, Sauletekio al. 11, Vilnius",
    "VILNIUS TECH Business and Management 2026": "VILNIUS TECH, Sauletekio al. 11, Vilnius",
    "National Conference of the Lithuanian Mathematical Society": "VILNIUS TECH, Sauletekio al. 11, Vilnius",
    "Mathematics Education Research Group Conference": "VILNIUS TECH, Sauletekio al. 11, Vilnius",
    "Information Society and University Studies IVUS 2026": "KTU Faculty of Informatics, Studentu g. 50, Kaunas",
    "International Young Researchers Conference Industrial Engineering 2026": "KTU Faculty of Mechanical Engineering and Design, Studentu g. 56, Kaunas",
    "Mechanika 2026": "KTU Faculty of Mechanical Engineering and Design, Studentu g. 56, Kaunas",
    "Mathematics and Natural Sciences: Theory and Application 2026": "KTU M-Lab, Studentu g. 63A, Kaunas",
}


def _apply_updates(table_name: str, key_column: str, location_by_key: dict[str, str]) -> None:
    conn = op.get_bind()
    stmt = sa.text(
        f"""
        UPDATE {table_name}
        SET location = :location
        WHERE {key_column} = :key
        """
    )
    for key, location in location_by_key.items():
        conn.execute(stmt, {"key": key, "location": location})


def upgrade() -> None:
    _apply_updates("clubs", "name", CLUB_LOCATION_UPDATES)
    _apply_updates("events", "title", EVENT_LOCATION_UPDATES)


def downgrade() -> None:
    # Keep the richer addresses on downgrade; older seed migrations still own
    # the original location text and will remove rows when their migrations run.
    pass
