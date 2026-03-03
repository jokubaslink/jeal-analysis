import uuid

from sqlalchemy import Boolean, Column, DateTime, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID

from .database import Base


class User(Base):
    __tablename__ = "users"

    # Authentication / identity
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)

    # Account status
    is_active = Column(Boolean, nullable=False, server_default="true")

    # Student profile data
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    school = Column(String(255), nullable=True)
    grade_year = Column(Integer, nullable=True)
    age_group = Column(String(50), nullable=True)
    city = Column(String(100), nullable=True)

    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
