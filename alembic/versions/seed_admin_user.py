"""seed default admin user

Creates admin@admin.com for local/dev access to the admin UI after migrations.
Password is documented in README.md (hashed with SHA-256, same as backend login).

Revision ID: seed_admin_user
Revises: add_is_admin_to_users
Create Date: 2026-04-01

"""
from __future__ import annotations

import hashlib
import uuid
from typing import Sequence, Union

from alembic import op
from sqlalchemy import text

revision: str = "seed_admin_user"
down_revision: Union[str, Sequence[str], None] = "add_is_admin_to_users"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

ADMIN_EMAIL = "admin@admin.com"
# Must satisfy backend password rules in backend/app/main.py (UserCreate).
ADMIN_PASSWORD_PLAIN = "Admin123!"


def _password_hash() -> str:
    return hashlib.sha256(ADMIN_PASSWORD_PLAIN.encode("utf-8")).hexdigest()


def upgrade() -> None:
    bind = op.get_bind()
    ph = _password_hash()
    admin_id = str(uuid.uuid4())
    bind.execute(
        text(
            """
            INSERT INTO users (id, email, password_hash, is_active, is_admin)
            SELECT CAST(:id AS uuid), :email, :ph, true, true
            WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = :email)
            """
        ),
        {"id": admin_id, "email": ADMIN_EMAIL, "ph": ph},
    )


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(text("DELETE FROM users WHERE email = :email"), {"email": ADMIN_EMAIL})
