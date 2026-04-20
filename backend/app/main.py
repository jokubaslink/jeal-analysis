import hashlib
import os
import uuid
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator, model_validator
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import Session, joinedload

from .database import SessionLocal
from . import models


app = FastAPI()


@app.exception_handler(OperationalError)
def handle_db_error(_request: Request, exc: OperationalError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "detail": "Database connection failed. Check that PostgreSQL is running and DATABASE_URL is set (e.g. port 5432 if you use a different port).",
        },
    )

cors_origins_env = os.getenv(
    "CORS_ALLOW_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
)
cors_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class UserCreate(BaseModel):
    email: str
    password: str
    first_name: str | None = None
    last_name: str | None = None
    name: str | None = None
    programme: str | None = None
    year: int | None = None
    faculty: str | None = None
    school: str | None = None
    grade_year: int | None = None
    age_group: str | None = None
    city: str | None = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        # Enforce minimum length
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long.")

        # Enforce basic complexity: upper, lower, digit, special
        has_upper = any(c.isupper() for c in v)
        has_lower = any(c.islower() for c in v)
        has_digit = any(c.isdigit() for c in v)
        has_special = any(not c.isalnum() for c in v)

        if not (has_upper and has_lower and has_digit and has_special):
            raise ValueError(
                "Password must include upper and lower case letters, a number, and a special character."
            )

        return v


class UserLogin(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    first_name: str | None = None
    last_name: str | None = None
    programme: str | None = None
    year: int | None = None
    faculty: str | None = None
    school: str | None = None
    grade_year: int | None = None
    age_group: str | None = None
    city: str | None = None


class UserMeOut(UserOut):
    is_admin: bool


class UserUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    programme: str | None = None
    year: int | None = None
    faculty: str | None = None
    school: str | None = None
    grade_year: int | None = None
    age_group: str | None = None
    city: str | None = None


class InterestCategoryOut(BaseModel):
    id: str
    name: str
    description: str | None = None


class InterestOut(BaseModel):
    id: str
    category_id: str
    name: str
    description: str | None = None


class ClubCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(None, max_length=1000)
    category_id: str | None = None
    city: str | None = Field(None, max_length=100)
    location: str | None = Field(None, max_length=255)
    website_url: str | None = Field(None, max_length=500)
    is_active: bool | None = None

    @field_validator("name")
    @classmethod
    def name_strip_non_empty(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Name cannot be empty.")
        return s

    @field_validator("description", "city", "location")
    @classmethod
    def optional_strip(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip()
        return s or None

    @field_validator("website_url")
    @classmethod
    def website_url_normalize(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip()
        if not s:
            return None
        lowered = s.lower()
        if not (lowered.startswith("http://") or lowered.startswith("https://")):
            raise ValueError("website_url must be an http(s) URL.")
        return s


class ClubUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    category_id: str | None = None
    city: str | None = None
    location: str | None = None
    website_url: str | None = None
    is_active: bool | None = None


class ClubOut(BaseModel):
    id: str
    name: str
    description: str | None = None
    category_id: str | None = None
    category_name: str | None = None
    city: str | None = None
    location: str | None = None
    website_url: str | None = None
    is_active: bool


class RecommendedClubOut(BaseModel):
    id: str
    name: str
    description: str | None = None
    category_id: str | None = None
    category_name: str | None = None
    city: str | None = None
    location: str | None = None
    website_url: str | None = None
    is_active: bool
    score: int


class EventCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(None, max_length=2000)
    category_id: str | None = None
    club_id: str | None = None
    start_time: datetime
    end_time: datetime | None = None
    city: str | None = Field(None, max_length=100)
    location: str | None = Field(None, max_length=255)
    is_online: bool | None = None
    registration_url: str | None = Field(None, max_length=500)

    @field_validator("title")
    @classmethod
    def title_strip_non_empty(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Title cannot be empty.")
        return s

    @field_validator("description", "city", "location")
    @classmethod
    def optional_strip_event(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip()
        return s or None

    @field_validator("start_time", "end_time")
    @classmethod
    def datetimes_utc_if_naive(cls, v: datetime | None) -> datetime | None:
        if v is None:
            return None
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v

    @field_validator("registration_url")
    @classmethod
    def registration_url_normalize(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip()
        if not s:
            return None
        lowered = s.lower()
        if not (lowered.startswith("http://") or lowered.startswith("https://")):
            raise ValueError("registration_url must be an http(s) URL.")
        return s

    @model_validator(mode="after")
    def end_not_before_start(self) -> "EventCreate":
        if self.end_time is not None and self.end_time < self.start_time:
            raise ValueError("end_time must be on or after start_time.")
        return self


class EventUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category_id: str | None = None
    club_id: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    city: str | None = None
    location: str | None = None
    is_online: bool | None = None
    registration_url: str | None = None

    @field_validator("title")
    @classmethod
    def title_strip_non_empty(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip()
        if not s:
            raise ValueError("Title cannot be empty.")
        return s

    @field_validator("description", "city", "location")
    @classmethod
    def optional_strip_event(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip()
        return s or None

    @field_validator("start_time", "end_time")
    @classmethod
    def datetimes_utc_if_naive(cls, v: datetime | None) -> datetime | None:
        if v is None:
            return None
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v

    @field_validator("registration_url")
    @classmethod
    def registration_url_normalize(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip()
        if not s:
            return None
        lowered = s.lower()
        if not (lowered.startswith("http://") or lowered.startswith("https://")):
            raise ValueError("registration_url must be an http(s) URL.")
        return s

    @model_validator(mode="after")
    def end_not_before_start(self) -> "EventUpdate":
        if self.end_time is not None and self.start_time is not None and self.end_time < self.start_time:
            raise ValueError("end_time must be on or after start_time.")
        return self


class EventOut(BaseModel):
    id: str
    title: str
    description: str | None = None
    category_id: str | None = None
    category_name: str | None = None
    club_id: str | None = None
    club_name: str | None = None
    start_time: str
    end_time: str | None = None
    city: str | None = None
    location: str | None = None
    is_online: bool
    registration_url: str | None = None


class RecommendedEventOut(BaseModel):
    id: str
    title: str
    date: str
    description: str | None = None
    category: str | None = None
    category_id: str | None = None
    category_name: str | None = None
    club_id: str | None = None
    club_name: str | None = None
    start_time: str
    end_time: str | None = None
    city: str | None = None
    location: str | None = None
    is_online: bool
    registration_url: str | None = None
    score: int


class RecommendationsOut(BaseModel):
    clubs: list["RecommendedClubOut"]
    events: list[RecommendedEventOut]


class UserInterestItem(BaseModel):
    interest_id: str
    level: str | None = None


class UserInterestOut(BaseModel):
    interest_id: str
    interest_name: str
    category_id: str | None = None
    category_name: str | None = None
    level: str | None = None


class UserInterestsUpdate(BaseModel):
    items: list[UserInterestItem]


class SimilarUserOut(BaseModel):
    user_id: str
    score: float
    faculty: str | None = None
    programme: str | None = None
    shared_interest_count: int


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    db: Session = Depends(get_db),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> models.User:
    """
    Lightweight auth for this project:
    Frontend sends `Authorization: Bearer <user_id>` where `<user_id>` is a UUID.
    """
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated.")

    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1].strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header.",
        )

    token = parts[1].strip()
    try:
        user_uuid = uuid.UUID(token)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token.",
        )

    user = db.query(models.User).filter(models.User.id == user_uuid).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token.")
    return user


def require_admin_user(current_user: models.User = Depends(get_current_user)) -> models.User:
    if not bool(current_user.is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return current_user


def _user_to_me_out(user: models.User) -> UserMeOut:
    return UserMeOut(
        id=str(user.id),
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        programme=user.programme,
        year=user.year,
        faculty=user.faculty,
        school=user.school,
        grade_year=user.grade_year,
        age_group=user.age_group,
        city=user.city,
        is_admin=bool(user.is_admin),
    )


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/users")
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    # Simple demo hash – replace with a stronger hashing algorithm (e.g. bcrypt) for real auth
    password_hash = hashlib.sha256(payload.password.encode("utf-8")).hexdigest()

    user = models.User(
        email=payload.email,
        password_hash=password_hash,
        first_name=payload.first_name,
        last_name=payload.last_name,
        name=payload.name,
        programme=payload.programme,
        year=payload.year,
        faculty=payload.faculty,
        school=payload.school,
        grade_year=payload.grade_year,
        age_group=payload.age_group,
        city=payload.city,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.post("/register")
def register_user(payload: UserCreate, db: Session = Depends(get_db)):
    password_hash = hashlib.sha256(payload.password.encode("utf-8")).hexdigest()

    user = models.User(
        email=payload.email,
        password_hash=password_hash,
        first_name=payload.first_name,
        last_name=payload.last_name,
        name=payload.name,
        programme=payload.programme,
        year=payload.year,
        faculty=payload.faculty,
        school=payload.school,
        grade_year=payload.grade_year,
        age_group=payload.age_group,
        city=payload.city,
    )
    try:
        db.add(user)
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists.",
        )

    return {"message": "Registration successful.", "user_id": str(user.id)}


@app.post("/login")
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    password_hash = hashlib.sha256(payload.password.encode("utf-8")).hexdigest()
    if user.password_hash != password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    return {
        "message": "Login successful",
        "user_id": str(user.id),
        "is_admin": bool(user.is_admin),
    }


@app.get("/me", response_model=UserMeOut)
def get_me(current_user: models.User = Depends(get_current_user)):
    return _user_to_me_out(current_user)


@app.get("/users/{user_id}", response_model=UserOut)
def get_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return UserOut(
        id=str(user.id),
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        programme=user.programme,
        year=user.year,
        faculty=user.faculty,
        school=user.school,
        grade_year=user.grade_year,
        age_group=user.age_group,
        city=user.city,
    )


@app.patch("/users/{user_id}", response_model=UserOut)
def update_user(user_id: str, payload: UserUpdate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    data = payload.model_dump(exclude_unset=True)
    allowed_fields = {
        "first_name",
        "last_name",
        "programme",
        "year",
        "faculty",
        "school",
        "grade_year",
        "age_group",
        "city",
    }

    for field, value in data.items():
        if field in allowed_fields:
            setattr(user, field, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Update failed. Email may already be in use.",
        )

    db.refresh(user)
    return UserOut(
        id=str(user.id),
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        programme=user.programme,
        year=user.year,
        faculty=user.faculty,
        school=user.school,
        grade_year=user.grade_year,
        age_group=user.age_group,
        city=user.city,
    )


@app.get("/users")
def list_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()


# Boost weights for similar-users ranking (same faculty / programme), applied on top of cosine and capped at 1.0
FACULTY_BOOST = 0.1
PROGRAMME_BOOST = 0.1
DEFAULT_SIMILAR_USERS_LIMIT = 10
MAX_SIMILAR_USERS_LIMIT = 50
DEFAULT_RECOMMENDED_CLUBS_LIMIT = 10
MAX_RECOMMENDED_CLUBS_LIMIT = 50
DEFAULT_RECOMMENDED_EVENTS_LIMIT = 10
MAX_RECOMMENDED_EVENTS_LIMIT = 50


def _resolve_recommendation_limit(
    raw_limit: int | None,
    *,
    default_limit: int,
    max_limit: int,
) -> int:
    if raw_limit is None:
        return default_limit

    if raw_limit <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="limit must be a positive integer.",
        )

    return min(raw_limit, max_limit)


def _get_category_interest_counts(user_id, db: Session) -> dict:
    rows = (
        db.query(models.Interest.category_id, func.count(models.Interest.id))
        .join(models.UserInterest, models.UserInterest.interest_id == models.Interest.id)
        .filter(models.UserInterest.user_id == user_id)
        .group_by(models.Interest.category_id)
        .all()
    )
    return {row[0]: int(row[1]) for row in rows if row[0] is not None}


def _build_recommended_clubs(
    category_interest_counts: dict,
    *,
    limit: int,
    db: Session,
) -> list["RecommendedClubOut"]:
    if not category_interest_counts:
        return []

    clubs = (
        db.query(models.Club)
        .options(joinedload(models.Club.category))
        .all()
    )

    scored: list[tuple[int, models.Club]] = []
    for club in clubs:
        score = category_interest_counts.get(club.category_id, 0)
        if score <= 0:
            continue
        scored.append((score, club))

    scored.sort(key=lambda x: (-x[0], (x[1].name or "").lower()))
    top = scored[:limit]

    return [
        RecommendedClubOut(
            id=str(c.id),
            name=c.name,
            description=c.description,
            category_id=str(c.category_id) if c.category_id else None,
            category_name=c.category.name if c.category else None,
            city=c.city,
            location=c.location,
            website_url=c.website_url,
            is_active=c.is_active,
            score=score,
        )
        for score, c in top
    ]


def _build_recommended_events(
    category_interest_counts: dict,
    *,
    limit: int,
    db: Session,
) -> list[RecommendedEventOut]:
    if not category_interest_counts:
        return []

    events = (
        db.query(models.Event)
        .options(
            joinedload(models.Event.category),
            joinedload(models.Event.club),
        )
        .filter(models.Event.start_time > func.now())
        .all()
    )

    scored: list[tuple[int, models.Event]] = []
    for event in events:
        score = category_interest_counts.get(event.category_id, 0)
        if score <= 0:
            continue
        scored.append((score, event))

    scored.sort(key=lambda x: (-x[0], x[1].start_time))
    top = scored[:limit]

    return [
        RecommendedEventOut(
            id=str(e.id),
            title=e.title,
            date=e.start_time.isoformat(),
            description=e.description,
            category=e.category.name if e.category else None,
            category_id=str(e.category_id) if e.category_id else None,
            category_name=e.category.name if e.category else None,
            club_id=str(e.club_id) if e.club_id else None,
            club_name=e.club.name if e.club else None,
            start_time=e.start_time.isoformat(),
            end_time=e.end_time.isoformat() if e.end_time else None,
            city=e.city,
            location=e.location,
            is_online=e.is_online,
            registration_url=e.registration_url,
            score=score,
        )
        for score, e in top
    ]


class SimilarUserPublicOut(BaseModel):
    name: str | None = None
    programme: str | None = None
    faculty: str | None = None


def _build_interest_vector(interest_ids: set, ordered_interest_ids: list) -> list[int]:
    """Build binary vector: 1 if user has that interest, 0 otherwise."""
    return [1 if iid in interest_ids else 0 for iid in ordered_interest_ids]


def _cosine_similarity(a: list[int], b: list[int]) -> float:
    """Cosine similarity between two vectors. Returns value in [0, 1]."""
    dot = sum(ai * bi for ai, bi in zip(a, b))
    norm_a = sum(a) ** 0.5
    norm_b = sum(b) ** 0.5
    if norm_a * norm_b <= 0:
        return 0.0
    return min(1.0, max(0.0, dot / (norm_a * norm_b)))


@app.get("/users/{user_id}/similar-users", response_model=list[SimilarUserOut])
def get_similar_users(user_id: str, db: Session = Depends(get_db)):
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format.",
        )

    current_user = db.query(models.User).filter(models.User.id == user_uuid).first()
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Canonical ordering of all interests (for consistent vectors)
    ordered_interest_ids = [
        row.id for row in db.query(models.Interest.id).order_by(models.Interest.id).all()
    ]
    if not ordered_interest_ids:
        return []

    current_interest_ids = {
        row.interest_id
        for row in db.query(models.UserInterest.interest_id).filter(
            models.UserInterest.user_id == user_uuid
        ).all()
    }
    current_vector = _build_interest_vector(current_interest_ids, ordered_interest_ids)
    if sum(current_vector) == 0:
        return []

    # All other users' interest sets (exclude current user)
    all_other_links = (
        db.query(models.UserInterest.user_id, models.UserInterest.interest_id)
        .filter(models.UserInterest.user_id != user_uuid)
        .all()
    )
    user_interest_sets: dict = {}
    for uid, iid in all_other_links:
        user_interest_sets.setdefault(uid, set()).add(iid)

    # All other users (exclude current); include users with no interests (cosine = 0)
    all_other_users = (
        db.query(models.User).filter(models.User.id != user_uuid).all()
    )
    other_user_ids = [u.id for u in all_other_users]
    user_by_id = {u.id: u for u in all_other_users}

    current_faculty = current_user.faculty
    current_programme = current_user.programme

    results = []
    for uid in other_user_ids:
        u = user_by_id.get(uid)
        if not u:
            continue
        other_interest_ids = user_interest_sets.get(uid, set())
        other_vector = _build_interest_vector(other_interest_ids, ordered_interest_ids)
        cosine = _cosine_similarity(current_vector, other_vector)
        score = cosine
        if current_faculty and u.faculty and current_faculty.strip() == u.faculty.strip():
            score += FACULTY_BOOST
        if current_programme and u.programme and current_programme.strip() == u.programme.strip():
            score += PROGRAMME_BOOST
        score = min(1.0, score)
        shared = sum(1 for a, b in zip(current_vector, other_vector) if a == b == 1)
        results.append(
            SimilarUserOut(
                user_id=str(u.id),
                score=round(score, 4),
                faculty=u.faculty,
                programme=u.programme,
                shared_interest_count=shared,
            )
        )

    results.sort(key=lambda x: x.score, reverse=True)
    return results


@app.get("/users/similar", response_model=list[SimilarUserPublicOut])
def get_similar_users_for_current_user(
    limit: int | None = Query(default=None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns similar users for the logged-in user.
    Privacy-safe fields only: name, programme, faculty.
    """
    if limit is None:
        limit_value = DEFAULT_SIMILAR_USERS_LIMIT
    else:
        if limit <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="limit must be a positive integer.",
            )
        limit_value = min(limit, MAX_SIMILAR_USERS_LIMIT)

    user_uuid = current_user.id

    # Canonical ordering of all interests (for consistent vectors)
    ordered_interest_ids = [
        row.id for row in db.query(models.Interest.id).order_by(models.Interest.id).all()
    ]
    if not ordered_interest_ids:
        return []

    current_interest_ids = {
        row.interest_id
        for row in db.query(models.UserInterest.interest_id).filter(
            models.UserInterest.user_id == user_uuid
        ).all()
    }
    current_vector = _build_interest_vector(current_interest_ids, ordered_interest_ids)
    if sum(current_vector) == 0:
        return []

    # All other users' interest sets (exclude current user)
    all_other_links = (
        db.query(models.UserInterest.user_id, models.UserInterest.interest_id)
        .filter(models.UserInterest.user_id != user_uuid)
        .all()
    )
    user_interest_sets: dict = {}
    for uid, iid in all_other_links:
        user_interest_sets.setdefault(uid, set()).add(iid)

    # All other users (exclude current); include users with no interests (cosine = 0)
    all_other_users = db.query(models.User).filter(models.User.id != user_uuid).all()
    user_by_id = {u.id: u for u in all_other_users}

    current_faculty = current_user.faculty
    current_programme = current_user.programme

    scored: list[tuple[float, models.User]] = []
    for uid, u in user_by_id.items():
        other_interest_ids = user_interest_sets.get(uid, set())
        other_vector = _build_interest_vector(other_interest_ids, ordered_interest_ids)
        cosine = _cosine_similarity(current_vector, other_vector)
        score = cosine
        if current_faculty and u.faculty and current_faculty.strip() == u.faculty.strip():
            score += FACULTY_BOOST
        if current_programme and u.programme and current_programme.strip() == u.programme.strip():
            score += PROGRAMME_BOOST
        score = min(1.0, score)
        scored.append((score, u))

    scored.sort(key=lambda x: x[0], reverse=True)
    top = scored[:limit_value]

    def _display_name(user: models.User) -> str | None:
        if user.name and user.name.strip():
            return user.name.strip()
        parts = [p.strip() for p in [user.first_name or "", user.last_name or ""] if p.strip()]
        if parts:
            return " ".join(parts)
        return None

    return [
        SimilarUserPublicOut(
            name=_display_name(u),
            programme=u.programme,
            faculty=u.faculty,
        )
        for _score, u in top
    ]


@app.get("/interest-categories", response_model=list[InterestCategoryOut])
def list_interest_categories(db: Session = Depends(get_db)):
    categories = db.query(models.InterestCategory).order_by(models.InterestCategory.name).all()
    return [
        InterestCategoryOut(
            id=str(c.id),
            name=c.name,
            description=c.description,
        )
        for c in categories
    ]


@app.post("/admin/clubs", response_model=ClubOut, status_code=status.HTTP_201_CREATED)
@app.post("/clubs", response_model=ClubOut, status_code=status.HTTP_201_CREATED)
def create_club(
    payload: ClubCreate,
    _admin: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    category_uuid: uuid.UUID | None = None
    if payload.category_id is not None:
        try:
            category_uuid = uuid.UUID(payload.category_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid category ID format.",
            )

        category = (
            db.query(models.InterestCategory)
            .filter(models.InterestCategory.id == category_uuid)
            .first()
        )
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category does not exist.",
            )

    club = models.Club(
        name=payload.name,
        description=payload.description,
        category_id=category_uuid,
        city=payload.city,
        location=payload.location,
        website_url=payload.website_url,
        is_active=payload.is_active if payload.is_active is not None else True,
    )

    db.add(club)
    db.commit()
    db.refresh(club)

    return ClubOut(
        id=str(club.id),
        name=club.name,
        description=club.description,
        category_id=str(club.category_id) if club.category_id else None,
        category_name=club.category.name if club.category else None,
        city=club.city,
        location=club.location,
        website_url=club.website_url,
        is_active=club.is_active,
    )


@app.get("/clubs", response_model=list[ClubOut])
def list_clubs(category_id: str | None = None, city: str | None = None, db: Session = Depends(get_db)):
    query = db.query(models.Club).join(
        models.InterestCategory,
        models.Club.category_id == models.InterestCategory.id,
        isouter=True,
    )

    if category_id is not None:
        try:
            category_uuid = uuid.UUID(category_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid category ID format.",
            )
        query = query.filter(models.Club.category_id == category_uuid)

    if city is not None:
        query = query.filter(models.Club.city == city)

    clubs = query.order_by(models.Club.name).all()
    return [
        ClubOut(
            id=str(c.id),
            name=c.name,
            description=c.description,
            category_id=str(c.category_id) if c.category_id else None,
            category_name=c.category.name if c.category else None,
            city=c.city,
            location=c.location,
            website_url=c.website_url,
            is_active=c.is_active,
        )
        for c in clubs
    ]


@app.get("/clubs/recommended", response_model=list[RecommendedClubOut])
def list_recommended_clubs(
    limit: int | None = Query(default=None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Recommend clubs to the logged-in user based on interest category overlap.
    Score increases when a club's category matches user interests; multiple
    interests in the same category increase the score further.
    """
    limit_value = _resolve_recommendation_limit(
        limit,
        default_limit=DEFAULT_RECOMMENDED_CLUBS_LIMIT,
        max_limit=MAX_RECOMMENDED_CLUBS_LIMIT,
    )
    category_interest_counts = _get_category_interest_counts(current_user.id, db)
    return _build_recommended_clubs(category_interest_counts, limit=limit_value, db=db)


@app.get("/clubs/{club_id}", response_model=ClubOut)
def get_club(club_id: str, db: Session = Depends(get_db)):
    try:
        club_uuid = uuid.UUID(club_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid club ID format.",
        )

    club = db.query(models.Club).filter(models.Club.id == club_uuid).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found.",
        )

    return ClubOut(
        id=str(club.id),
        name=club.name,
        description=club.description,
        category_id=str(club.category_id) if club.category_id else None,
        category_name=club.category.name if club.category else None,
        city=club.city,
        location=club.location,
        website_url=club.website_url,
        is_active=club.is_active,
    )


@app.patch("/clubs/{club_id}", response_model=ClubOut)
def update_club(club_id: str, payload: ClubUpdate, db: Session = Depends(get_db)):
    try:
        club_uuid = uuid.UUID(club_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid club ID format.",
        )

    club = db.query(models.Club).filter(models.Club.id == club_uuid).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found.",
        )

    data = payload.model_dump(exclude_unset=True)

    if "category_id" in data:
        raw = data["category_id"]
        if raw is None:
            club.category_id = None
        else:
            try:
                category_uuid = uuid.UUID(raw)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid category ID format.",
                )

            category = (
                db.query(models.InterestCategory)
                .filter(models.InterestCategory.id == category_uuid)
                .first()
            )
            if not category:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Category does not exist.",
                )
            club.category_id = category_uuid

    if "name" in data and data["name"] is not None:
        club.name = data["name"]
    if "description" in data:
        club.description = data["description"]
    if "city" in data:
        club.city = data["city"]
    if "location" in data:
        club.location = data["location"]
    if "website_url" in data:
        club.website_url = data["website_url"]
    if "is_active" in data and data["is_active"] is not None:
        club.is_active = data["is_active"]

    db.commit()
    db.refresh(club)

    return ClubOut(
        id=str(club.id),
        name=club.name,
        description=club.description,
        category_id=str(club.category_id) if club.category_id else None,
        category_name=club.category.name if club.category else None,
        city=club.city,
        location=club.location,
        website_url=club.website_url,
        is_active=club.is_active,
    )


@app.delete("/clubs/{club_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_club(club_id: str, db: Session = Depends(get_db)):
    try:
        club_uuid = uuid.UUID(club_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid club ID format.",
        )

    club = db.query(models.Club).filter(models.Club.id == club_uuid).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found.",
        )

    db.delete(club)
    db.commit()
    return


@app.post("/admin/events", response_model=EventOut, status_code=status.HTTP_201_CREATED)
@app.post("/events", response_model=EventOut, status_code=status.HTTP_201_CREATED)
def create_event(
    payload: EventCreate,
    _admin: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    category_uuid: uuid.UUID | None = None
    club_uuid: uuid.UUID | None = None

    if payload.category_id is not None:
        try:
            category_uuid = uuid.UUID(payload.category_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid category ID format.",
            )

        category = (
            db.query(models.InterestCategory)
            .filter(models.InterestCategory.id == category_uuid)
            .first()
        )
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category does not exist.",
            )

    if payload.club_id is not None:
        try:
            club_uuid = uuid.UUID(payload.club_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid club ID format.",
            )

        club = db.query(models.Club).filter(models.Club.id == club_uuid).first()
        if not club:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Club does not exist.",
            )

    event = models.Event(
        title=payload.title,
        description=payload.description,
        category_id=category_uuid,
        club_id=club_uuid,
        start_time=payload.start_time,
        end_time=payload.end_time,
        city=payload.city,
        location=payload.location,
        is_online=payload.is_online if payload.is_online is not None else False,
        registration_url=payload.registration_url,
    )

    db.add(event)
    db.commit()
    db.refresh(event)

    return EventOut(
        id=str(event.id),
        title=event.title,
        description=event.description,
        category_id=str(event.category_id) if event.category_id else None,
        category_name=event.category.name if event.category else None,
        club_id=str(event.club_id) if event.club_id else None,
        club_name=event.club.name if event.club else None,
        start_time=event.start_time.isoformat(),
        end_time=event.end_time.isoformat() if event.end_time else None,
        city=event.city,
        location=event.location,
        is_online=event.is_online,
        registration_url=event.registration_url,
    )


@app.get("/events", response_model=list[EventOut])
def list_events(
    category_id: str | None = None,
    club_id: str | None = None,
    city: str | None = None,
    db: Session = Depends(get_db),
):
    query = (
        db.query(models.Event)
        .join(
            models.InterestCategory,
            models.Event.category_id == models.InterestCategory.id,
            isouter=True,
        )
        .join(
            models.Club,
            models.Event.club_id == models.Club.id,
            isouter=True,
        )
    )

    if category_id is not None:
        try:
            category_uuid = uuid.UUID(category_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid category ID format.",
            )
        query = query.filter(models.Event.category_id == category_uuid)

    if club_id is not None:
        try:
            club_uuid = uuid.UUID(club_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid club ID format.",
            )
        query = query.filter(models.Event.club_id == club_uuid)

    if city is not None:
        query = query.filter(models.Event.city == city)

    events = query.order_by(models.Event.start_time.desc()).all()
    return [
        EventOut(
            id=str(e.id),
            title=e.title,
            description=e.description,
            category_id=str(e.category_id) if e.category_id else None,
            category_name=e.category.name if e.category else None,
            club_id=str(e.club_id) if e.club_id else None,
            club_name=e.club.name if e.club else None,
            start_time=e.start_time.isoformat(),
            end_time=e.end_time.isoformat() if e.end_time else None,
            city=e.city,
            location=e.location,
            is_online=e.is_online,
            registration_url=e.registration_url,
        )
        for e in events
    ]


@app.get("/admin/events", response_model=list[EventOut])
def list_events_admin(
    category_id: str | None = None,
    club_id: str | None = None,
    city: str | None = None,
    _admin: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    return list_events(category_id=category_id, club_id=club_id, city=city, db=db)


@app.get("/events/recommended", response_model=list[RecommendedEventOut])
def list_recommended_events(
    limit: int | None = Query(default=None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Recommend upcoming events to the logged-in user based on interest category overlap.
    Only events with start_time > now are considered.
    """
    limit_value = _resolve_recommendation_limit(
        limit,
        default_limit=DEFAULT_RECOMMENDED_EVENTS_LIMIT,
        max_limit=MAX_RECOMMENDED_EVENTS_LIMIT,
    )
    category_interest_counts = _get_category_interest_counts(current_user.id, db)
    return _build_recommended_events(category_interest_counts, limit=limit_value, db=db)


@app.get("/recommendations", response_model=RecommendationsOut)
def get_recommendations(
    club_limit: int | None = Query(default=None),
    event_limit: int | None = Query(default=None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return club and event recommendations together so clients can populate a dashboard
    in one request while sharing the same interest-score lookup.
    """
    club_limit_value = _resolve_recommendation_limit(
        club_limit,
        default_limit=DEFAULT_RECOMMENDED_CLUBS_LIMIT,
        max_limit=MAX_RECOMMENDED_CLUBS_LIMIT,
    )
    event_limit_value = _resolve_recommendation_limit(
        event_limit,
        default_limit=DEFAULT_RECOMMENDED_EVENTS_LIMIT,
        max_limit=MAX_RECOMMENDED_EVENTS_LIMIT,
    )
    category_interest_counts = _get_category_interest_counts(current_user.id, db)

    return RecommendationsOut(
        clubs=_build_recommended_clubs(category_interest_counts, limit=club_limit_value, db=db),
        events=_build_recommended_events(category_interest_counts, limit=event_limit_value, db=db),
    )


@app.get("/events/{event_id}", response_model=EventOut)
def get_event(event_id: str, db: Session = Depends(get_db)):
    try:
        event_uuid = uuid.UUID(event_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid event ID format.",
        )

    event = db.query(models.Event).filter(models.Event.id == event_uuid).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found.",
        )

    return EventOut(
        id=str(event.id),
        title=event.title,
        description=event.description,
        category_id=str(event.category_id) if event.category_id else None,
        category_name=event.category.name if event.category else None,
        club_id=str(event.club_id) if event.club_id else None,
        club_name=event.club.name if event.club else None,
        start_time=event.start_time.isoformat(),
        end_time=event.end_time.isoformat() if event.end_time else None,
        city=event.city,
        location=event.location,
        is_online=event.is_online,
        registration_url=event.registration_url,
    )


@app.get("/admin/events/{event_id}", response_model=EventOut)
def get_event_admin(
    event_id: str,
    _admin: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    return get_event(event_id=event_id, db=db)


@app.patch("/events/{event_id}", response_model=EventOut)
def update_event(event_id: str, payload: EventUpdate, db: Session = Depends(get_db)):
    try:
        event_uuid = uuid.UUID(event_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid event ID format.",
        )

    event = db.query(models.Event).filter(models.Event.id == event_uuid).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found.",
        )

    data = payload.model_dump(exclude_unset=True)

    if "category_id" in data:
        raw = data["category_id"]
        if raw is None:
            event.category_id = None
        else:
            try:
                category_uuid = uuid.UUID(raw)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid category ID format.",
                )

            category = (
                db.query(models.InterestCategory)
                .filter(models.InterestCategory.id == category_uuid)
                .first()
            )
            if not category:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Category does not exist.",
                )
            event.category_id = category_uuid

    if "club_id" in data:
        raw = data["club_id"]
        if raw is None:
            event.club_id = None
        else:
            try:
                club_uuid = uuid.UUID(raw)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid club ID format.",
                )

            club = db.query(models.Club).filter(models.Club.id == club_uuid).first()
            if not club:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Club does not exist.",
                )
            event.club_id = club_uuid

    if "title" in data and data["title"] is not None:
        event.title = data["title"]
    if "description" in data:
        event.description = data["description"]
    if "start_time" in data and data["start_time"] is not None:
        event.start_time = data["start_time"]
    if "end_time" in data:
        event.end_time = data["end_time"]
    if "city" in data:
        event.city = data["city"]
    if "location" in data:
        event.location = data["location"]
    if "is_online" in data and data["is_online"] is not None:
        event.is_online = data["is_online"]
    if "registration_url" in data:
        event.registration_url = data["registration_url"]

    db.commit()
    db.refresh(event)

    return EventOut(
        id=str(event.id),
        title=event.title,
        description=event.description,
        category_id=str(event.category_id) if event.category_id else None,
        category_name=event.category.name if event.category else None,
        club_id=str(event.club_id) if event.club_id else None,
        club_name=event.club.name if event.club else None,
        start_time=event.start_time.isoformat(),
        end_time=event.end_time.isoformat() if event.end_time else None,
        city=event.city,
        location=event.location,
        is_online=event.is_online,
        registration_url=event.registration_url,
    )


@app.patch("/admin/events/{event_id}", response_model=EventOut)
def update_event_admin(
    event_id: str,
    payload: EventUpdate,
    _admin: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    return update_event(event_id=event_id, payload=payload, db=db)


@app.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(event_id: str, db: Session = Depends(get_db)):
    try:
        event_uuid = uuid.UUID(event_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid event ID format.",
        )

    event = db.query(models.Event).filter(models.Event.id == event_uuid).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found.",
        )

    db.delete(event)
    db.commit()
    return
@app.get("/interests", response_model=list[InterestOut])
def list_interests(category_id: str | None = None, db: Session = Depends(get_db)):
    query = db.query(models.Interest)
    if category_id is not None:
        query = query.filter(models.Interest.category_id == category_id)
    interests = query.order_by(models.Interest.name).all()
    return [
        InterestOut(
            id=str(i.id),
            category_id=str(i.category_id),
            name=i.name,
            description=i.description,
        )
        for i in interests
    ]


@app.put("/users/{user_id}/interests", response_model=list[UserInterestOut])
def update_user_interests(
    user_id: str,
    payload: UserInterestsUpdate,
    db: Session = Depends(get_db),
):
    # validate user_id format
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format.",
        )

    # ensure user exists
    user = db.query(models.User).filter(models.User.id == user_uuid).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    items = payload.items or []
    if not items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one interest is required.",
        )

    raw_interest_ids = [item.interest_id for item in items]

    try:
        interest_uuids = [uuid.UUID(value) for value in raw_interest_ids]
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid interest ID format.",
        )

    if interest_uuids:
        # ensure all requested interests exist
        rows = (
            db.query(models.Interest.id)
            .filter(models.Interest.id.in_(interest_uuids))
            .all()
        )
        found_ids = {row.id for row in rows}
        missing = set(interest_uuids) - found_ids
        if missing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more interests were not found.",
            )

    # replace the user's interests in a single transaction
    (
        db.query(models.UserInterest)
        .filter(models.UserInterest.user_id == user_uuid)
        .delete()
    )

    # insert new links (no duplicates thanks to PK on user_id + interest_id)
    level_by_id: dict[uuid.UUID, str | None] = {}
    for item in items:
        level_by_id[uuid.UUID(item.interest_id)] = item.level

    for interest_id in interest_uuids:
        link = models.UserInterest(
            user_id=user_uuid,
            interest_id=interest_id,
            level=level_by_id.get(interest_id),
        )
        db.add(link)

    db.commit()

    # return updated list
    links = (
        db.query(models.UserInterest)
        .join(models.Interest, models.UserInterest.interest_id == models.Interest.id)
        .join(
            models.InterestCategory,
            models.Interest.category_id == models.InterestCategory.id,
            isouter=True,
        )
        .filter(models.UserInterest.user_id == user_uuid)
        .all()
    )

    return [
        UserInterestOut(
            interest_id=str(link.interest.id),
            interest_name=link.interest.name,
            category_id=str(link.interest.category_id)
            if link.interest.category_id
            else None,
            category_name=link.interest.category.name
            if link.interest.category
            else None,
            level=link.level,
        )
        for link in links
    ]


@app.get("/users/{user_id}/interests", response_model=list[UserInterestOut])
def list_user_interests(user_id: str, db: Session = Depends(get_db)):
    # validate user_id format
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format.",
        )

    # ensure user exists
    user_exists = (
        db.query(models.User.id).filter(models.User.id == user_uuid).first()
    )
    if not user_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    links = (
        db.query(models.UserInterest)
        .join(models.Interest, models.UserInterest.interest_id == models.Interest.id)
        .join(
            models.InterestCategory,
            models.Interest.category_id == models.InterestCategory.id,
            isouter=True,
        )
        .filter(models.UserInterest.user_id == user_uuid)
        .all()
    )

    return [
        UserInterestOut(
            interest_id=str(link.interest.id),
            interest_name=link.interest.name,
            category_id=str(link.interest.category_id)
            if link.interest.category_id
            else None,
            category_name=link.interest.category.name
            if link.interest.category
            else None,
            level=link.level,
        )
        for link in links
    ]
