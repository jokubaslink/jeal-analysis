import uuid

from sqlalchemy import Boolean, Column, DateTime, Integer, String, func, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

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
    name = Column(String(255), nullable=True)
    programme = Column(String(255), nullable=True)
    year = Column(Integer, nullable=True)
    faculty = Column(String(255), nullable=True)
    school = Column(String(255), nullable=True)
    grade_year = Column(Integer, nullable=True)
    age_group = Column(String(50), nullable=True)
    city = Column(String(100), nullable=True)

    # Relationships
    interests = relationship("UserInterest", back_populates="user", cascade="all, delete-orphan")

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


class InterestCategory(Base):
    __tablename__ = "interest_categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), unique=True, nullable=False)
    description = Column(String(500), nullable=True)

    interests = relationship("Interest", back_populates="category", cascade="all, delete-orphan")

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


class Interest(Base):
    __tablename__ = "interests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_id = Column(UUID(as_uuid=True), ForeignKey("interest_categories.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(String(500), nullable=True)

    category = relationship("InterestCategory", back_populates="interests")
    user_links = relationship("UserInterest", back_populates="interest", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("category_id", "name", name="uq_interest_category_name"),
    )

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


class UserInterest(Base):
    __tablename__ = "user_interests"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    interest_id = Column(UUID(as_uuid=True), ForeignKey("interests.id"), primary_key=True)
    level = Column(String(50), nullable=True)

    user = relationship("User", back_populates="interests")
    interest = relationship("Interest", back_populates="user_links")

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
