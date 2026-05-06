import hashlib
import os
import uuid
from datetime import datetime, time, timedelta, timezone

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
    meeting_weekday: int | None = Field(None, ge=0, le=6)
    meeting_start_time: str | None = None
    meeting_end_time: str | None = None

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

    @field_validator("meeting_start_time", "meeting_end_time")
    @classmethod
    def optional_time_string(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip()
        if not s:
            return None
        try:
            parsed = time.fromisoformat(s)
        except ValueError:
            raise ValueError("Time must use HH:MM or HH:MM:SS format.")
        return parsed.strftime("%H:%M")

    @model_validator(mode="after")
    def validate_meeting_schedule(self) -> "ClubCreate":
        if self.meeting_weekday is None:
            if self.meeting_start_time is not None or self.meeting_end_time is not None:
                raise ValueError("meeting_weekday is required when meeting times are set.")
            return self

        if self.meeting_start_time is None:
            raise ValueError("meeting_start_time is required when meeting_weekday is set.")
        if self.meeting_end_time is not None and self.meeting_end_time <= self.meeting_start_time:
            raise ValueError("meeting_end_time must be after meeting_start_time.")
        return self


class ClubUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    category_id: str | None = None
    city: str | None = None
    location: str | None = None
    website_url: str | None = None
    is_active: bool | None = None
    meeting_weekday: int | None = Field(None, ge=0, le=6)
    meeting_start_time: str | None = None
    meeting_end_time: str | None = None

    @field_validator("name")
    @classmethod
    def name_strip_non_empty(cls, v: str | None) -> str | None:
        if v is None:
            return None
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

    @field_validator("meeting_start_time", "meeting_end_time")
    @classmethod
    def optional_time_string(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip()
        if not s:
            return None
        try:
            parsed = time.fromisoformat(s)
        except ValueError:
            raise ValueError("Time must use HH:MM or HH:MM:SS format.")
        return parsed.strftime("%H:%M")

    @model_validator(mode="after")
    def validate_meeting_schedule(self) -> "ClubUpdate":
        provided_weekday = self.meeting_weekday is not None
        provided_start = self.meeting_start_time is not None
        provided_end = self.meeting_end_time is not None

        if not (provided_weekday or provided_start or provided_end):
            return self

        if self.meeting_weekday is None and (provided_start or provided_end):
            raise ValueError("meeting_weekday is required when meeting times are set.")
        if self.meeting_weekday is not None and self.meeting_start_time is None and provided_end:
            raise ValueError("meeting_start_time is required when meeting_end_time is set.")
        if self.meeting_end_time is not None and self.meeting_start_time is not None:
            if self.meeting_end_time <= self.meeting_start_time:
                raise ValueError("meeting_end_time must be after meeting_start_time.")
        return self


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
    member_count: int
    meeting_weekday: int | None = None
    meeting_start_time: str | None = None
    meeting_end_time: str | None = None


class JoinedClubOut(ClubOut):
    joined_at: str


class ClubVisibilityUpdate(BaseModel):
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
    member_count: int
    meeting_weekday: int | None = None
    meeting_start_time: str | None = None
    meeting_end_time: str | None = None
    score: int


class FeedbackInput(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: str | None = Field(None, max_length=1000)

    @field_validator("comment")
    @classmethod
    def normalize_comment(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip()
        return s or None


class EventFeedbackOut(BaseModel):
    event_id: str
    event_title: str
    rating: int
    comment: str | None = None
    submitted_at: str


class ClubFeedbackOpportunityOut(BaseModel):
    activity_start_time: str
    activity_end_time: str | None = None
    already_submitted: bool


class ClubActivityFeedbackCreate(FeedbackInput):
    activity_start_time: datetime

    @field_validator("activity_start_time")
    @classmethod
    def activity_start_time_utc_if_naive(cls, v: datetime) -> datetime:
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v


class ClubActivityFeedbackOut(BaseModel):
    club_id: str
    club_name: str
    activity_start_time: str
    activity_end_time: str | None = None
    rating: int
    comment: str | None = None
    submitted_at: str


class ClubFeedbackContextOut(BaseModel):
    opportunities: list[ClubFeedbackOpportunityOut]
    submitted_feedback: list[ClubActivityFeedbackOut]


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
    image_url: str | None = Field(None, max_length=1000)

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

    @field_validator("image_url")
    @classmethod
    def image_url_normalize(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip()
        if not s:
            return None
        lowered = s.lower()
        if not (lowered.startswith("http://") or lowered.startswith("https://")):
            raise ValueError("image_url must be an http(s) URL.")
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
    image_url: str | None = None

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

    @field_validator("image_url")
    @classmethod
    def image_url_normalize(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip()
        if not s:
            return None
        lowered = s.lower()
        if not (lowered.startswith("http://") or lowered.startswith("https://")):
            raise ValueError("image_url must be an http(s) URL.")
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
    is_active: bool
    is_online: bool
    registration_url: str | None = None
    image_url: str | None = None
    attendee_count: int


class RegisteredEventOut(EventOut):
    registered_at: str


class EventVisibilityUpdate(BaseModel):
    is_active: bool


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
    image_url: str | None = None
    attendee_count: int
    score: int


class AdminEventFeedbackOut(BaseModel):
    user_id: str
    user_email: str
    user_name: str | None = None
    event_id: str
    event_title: str
    event_start_time: str
    rating: int
    comment: str | None = None
    submitted_at: str


class AdminClubActivityFeedbackOut(BaseModel):
    user_id: str
    user_email: str
    user_name: str | None = None
    club_id: str
    club_name: str
    activity_start_time: str
    activity_end_time: str | None = None
    rating: int
    comment: str | None = None
    submitted_at: str


class AdminFeedbackSummaryOut(BaseModel):
    event_feedback: list[AdminEventFeedbackOut]
    club_activity_feedback: list[AdminClubActivityFeedbackOut]


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


def _club_member_count(club: models.Club) -> int:
    memberships = getattr(club, "memberships", None)
    return len(memberships) if memberships is not None else 0


def _event_attendee_count(event: models.Event) -> int:
    registrations = getattr(event, "registrations", None)
    return len(registrations) if registrations is not None else 0


def _serialize_club(club: models.Club) -> ClubOut:
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
        member_count=_club_member_count(club),
        meeting_weekday=club.meeting_weekday,
        meeting_start_time=(
            club.meeting_start_time.strftime("%H:%M") if club.meeting_start_time else None
        ),
        meeting_end_time=(
            club.meeting_end_time.strftime("%H:%M") if club.meeting_end_time else None
        ),
    )


def _serialize_joined_club(membership: models.UserClubMembership) -> JoinedClubOut:
    return JoinedClubOut(
        **_serialize_club(membership.club).model_dump(),
        joined_at=membership.created_at.isoformat(),
    )


def _display_user_name(user: models.User) -> str | None:
    if user.name and user.name.strip():
        return user.name.strip()
    parts = [p.strip() for p in [user.first_name or "", user.last_name or ""] if p.strip()]
    if parts:
        return " ".join(parts)
    return None


def _event_feedback_cutoff(event: models.Event) -> datetime:
    cutoff = event.end_time or event.start_time
    if cutoff.tzinfo is None:
        cutoff = cutoff.replace(tzinfo=timezone.utc)
    return cutoff


def _is_event_feedback_open(event: models.Event) -> bool:
    return _event_feedback_cutoff(event) <= datetime.now(timezone.utc)


def _club_activity_end_time(
    club: models.Club,
    activity_start_time: datetime,
) -> datetime | None:
    if not club.meeting_end_time:
        return None
    return datetime.combine(
        activity_start_time.date(),
        club.meeting_end_time,
        tzinfo=timezone.utc,
    )


def _serialize_event_feedback(feedback: models.EventFeedback) -> EventFeedbackOut:
    return EventFeedbackOut(
        event_id=str(feedback.event.id),
        event_title=feedback.event.title,
        rating=feedback.rating,
        comment=feedback.comment,
        submitted_at=feedback.created_at.isoformat(),
    )


def _serialize_club_activity_feedback(
    feedback: models.ClubActivityFeedback,
) -> ClubActivityFeedbackOut:
    activity_end_time = _club_activity_end_time(feedback.club, feedback.activity_start_time)
    return ClubActivityFeedbackOut(
        club_id=str(feedback.club.id),
        club_name=feedback.club.name,
        activity_start_time=feedback.activity_start_time.isoformat(),
        activity_end_time=activity_end_time.isoformat() if activity_end_time else None,
        rating=feedback.rating,
        comment=feedback.comment,
        submitted_at=feedback.created_at.isoformat(),
    )


def _build_recent_club_feedback_opportunities(
    membership: models.UserClubMembership,
    submitted_start_times: set[datetime],
    *,
    limit: int = 6,
) -> list[ClubFeedbackOpportunityOut]:
    club = membership.club
    if club.meeting_weekday is None or club.meeting_start_time is None:
        return []

    now = datetime.now(timezone.utc)
    joined_at = membership.created_at
    if joined_at.tzinfo is None:
        joined_at = joined_at.replace(tzinfo=timezone.utc)

    candidate_date = now.date() - timedelta(days=(now.date().weekday() - club.meeting_weekday) % 7)
    opportunities: list[ClubFeedbackOpportunityOut] = []

    while len(opportunities) < limit:
        activity_start = datetime.combine(
            candidate_date,
            club.meeting_start_time,
            tzinfo=timezone.utc,
        )
        if activity_start < joined_at:
            break
        if activity_start <= now:
            activity_end = _club_activity_end_time(club, activity_start)
            opportunities.append(
                ClubFeedbackOpportunityOut(
                    activity_start_time=activity_start.isoformat(),
                    activity_end_time=activity_end.isoformat() if activity_end else None,
                    already_submitted=activity_start in submitted_start_times,
                )
            )
        candidate_date -= timedelta(days=7)

    return opportunities


def _is_valid_club_feedback_occurrence(
    membership: models.UserClubMembership,
    activity_start_time: datetime,
) -> bool:
    club = membership.club
    if club.meeting_weekday is None or club.meeting_start_time is None:
        return False

    joined_at = membership.created_at
    if joined_at.tzinfo is None:
        joined_at = joined_at.replace(tzinfo=timezone.utc)
    if activity_start_time.tzinfo is None:
        activity_start_time = activity_start_time.replace(tzinfo=timezone.utc)

    if activity_start_time > datetime.now(timezone.utc):
        return False
    if activity_start_time < joined_at:
        return False
    if activity_start_time.weekday() != club.meeting_weekday:
        return False
    if activity_start_time.time().replace(tzinfo=None) != club.meeting_start_time:
        return False
    return True


def _get_club_or_404(
    club_id: str,
    *,
    db: Session,
    active_only: bool = False,
) -> models.Club:
    try:
        club_uuid = uuid.UUID(club_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid club ID format.",
        )

    club = (
        db.query(models.Club)
        .options(
            joinedload(models.Club.category),
            joinedload(models.Club.memberships),
        )
        .filter(models.Club.id == club_uuid)
        .first()
    )
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found.",
        )
    if active_only and not club.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found.",
        )
    return club


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


def _require_self_or_admin(target_user_id: str, current_user: models.User) -> None:
    if str(current_user.id) != target_user_id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this user's data.",
        )


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


def _get_user_interest_ids(user_id, db: Session) -> set[uuid.UUID]:
    rows = (
        db.query(models.UserInterest.interest_id)
        .filter(models.UserInterest.user_id == user_id)
        .all()
    )
    return {row[0] for row in rows if row[0] is not None}


def _score_club_for_user(
    club: models.Club,
    category_interest_counts: dict,
    user_interest_ids: set[uuid.UUID],
) -> int:
    exact_interest_matches = 0
    if user_interest_ids:
        exact_interest_matches = sum(
            1
            for link in getattr(club, "interest_links", []) or []
            if link.interest_id in user_interest_ids
        )

    category_score = category_interest_counts.get(club.category_id, 0)
    return (exact_interest_matches * 3) + category_score


def _score_event_for_user(
    event: models.Event,
    category_interest_counts: dict,
    user_interest_ids: set[uuid.UUID],
) -> int:
    event_category_score = category_interest_counts.get(event.category_id, 0)
    club_category_score = 0
    exact_club_interest_matches = 0

    if event.club:
        club_category_score = category_interest_counts.get(event.club.category_id, 0)
        if user_interest_ids:
            exact_club_interest_matches = sum(
                1
                for link in getattr(event.club, "interest_links", []) or []
                if link.interest_id in user_interest_ids
            )

    return (exact_club_interest_matches * 3) + max(event_category_score, club_category_score)


def _build_recommended_clubs(
    category_interest_counts: dict,
    user_interest_ids: set[uuid.UUID],
    *,
    limit: int,
    db: Session,
) -> list["RecommendedClubOut"]:
    if not category_interest_counts:
        return []

    clubs = (
        db.query(models.Club)
        .options(
            joinedload(models.Club.category),
            joinedload(models.Club.interest_links),
            joinedload(models.Club.memberships),
        )
        .filter(models.Club.is_active.is_(True))
        .all()
    )

    scored: list[tuple[int, models.Club]] = []
    for club in clubs:
        score = _score_club_for_user(club, category_interest_counts, user_interest_ids)
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
            member_count=_club_member_count(c),
            meeting_weekday=c.meeting_weekday,
            meeting_start_time=(
                c.meeting_start_time.strftime("%H:%M") if c.meeting_start_time else None
            ),
            meeting_end_time=(
                c.meeting_end_time.strftime("%H:%M") if c.meeting_end_time else None
            ),
            score=score,
        )
        for score, c in top
    ]


def _build_recommended_events(
    category_interest_counts: dict,
    user_interest_ids: set[uuid.UUID],
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
            joinedload(models.Event.club).joinedload(models.Club.interest_links),
            joinedload(models.Event.registrations),
        )
        .filter(models.Event.is_active.is_(True))
        .filter(models.Event.start_time > func.now())
        .all()
    )

    scored: list[tuple[int, models.Event]] = []
    for event in events:
        score = _score_event_for_user(event, category_interest_counts, user_interest_ids)
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
            image_url=e.image_url,
            attendee_count=_event_attendee_count(e),
            score=score,
        )
        for score, e in top
    ]


def _build_events_query(
    *,
    db: Session,
    category_id: str | None = None,
    club_id: str | None = None,
    city: str | None = None,
):
    query = (
        db.query(models.Event)
        .options(
            joinedload(models.Event.category),
            joinedload(models.Event.club),
            joinedload(models.Event.registrations),
        )
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

    return query


def _serialize_event(event: models.Event) -> EventOut:
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
        is_active=event.is_active,
        is_online=event.is_online,
        registration_url=event.registration_url,
        image_url=event.image_url,
        attendee_count=_event_attendee_count(event),
    )


def _serialize_registered_event(
    registration: models.UserEventRegistration,
) -> RegisteredEventOut:
    event = registration.event
    return RegisteredEventOut(
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
        is_active=event.is_active,
        is_online=event.is_online,
        registration_url=event.registration_url,
        image_url=event.image_url,
        attendee_count=_event_attendee_count(event),
        registered_at=registration.created_at.isoformat(),
    )


def _get_event_or_404(
    event_id: str,
    *,
    db: Session,
    active_only: bool = False,
) -> models.Event:
    try:
        event_uuid = uuid.UUID(event_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid event ID format.",
        )

    query = (
        db.query(models.Event)
        .options(
            joinedload(models.Event.category),
            joinedload(models.Event.club),
            joinedload(models.Event.registrations),
        )
        .filter(models.Event.id == event_uuid)
    )
    if active_only:
        query = query.filter(models.Event.is_active.is_(True))

    event = query.first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found.",
        )

    return event


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

    return [
        SimilarUserPublicOut(
            name=_display_user_name(u),
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
        meeting_weekday=payload.meeting_weekday,
        meeting_start_time=(
            time.fromisoformat(payload.meeting_start_time) if payload.meeting_start_time else None
        ),
        meeting_end_time=(
            time.fromisoformat(payload.meeting_end_time) if payload.meeting_end_time else None
        ),
    )

    db.add(club)
    db.commit()
    db.refresh(club)

    return _serialize_club(club)


@app.get("/clubs", response_model=list[ClubOut])
def list_clubs(category_id: str | None = None, city: str | None = None, db: Session = Depends(get_db)):
    query = (
        db.query(models.Club)
        .options(
            joinedload(models.Club.category),
            joinedload(models.Club.memberships),
        )
        .join(
            models.InterestCategory,
            models.Club.category_id == models.InterestCategory.id,
            isouter=True,
        )
        .filter(models.Club.is_active.is_(True))
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
    return [_serialize_club(club) for club in clubs]


@app.get("/admin/clubs", response_model=list[ClubOut])
def list_clubs_admin(
    category_id: str | None = None,
    city: str | None = None,
    _admin: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    query = db.query(models.Club).join(
        models.InterestCategory,
        models.Club.category_id == models.InterestCategory.id,
        isouter=True,
    ).options(
        joinedload(models.Club.category),
        joinedload(models.Club.memberships),
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
    return [_serialize_club(club) for club in clubs]


@app.get("/clubs/recommended", response_model=list[RecommendedClubOut])
def list_recommended_clubs(
    limit: int | None = Query(default=None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Recommend clubs to the logged-in user based on exact seeded interest links,
    with category overlap as a fallback for broader discovery.
    """
    limit_value = _resolve_recommendation_limit(
        limit,
        default_limit=DEFAULT_RECOMMENDED_CLUBS_LIMIT,
        max_limit=MAX_RECOMMENDED_CLUBS_LIMIT,
    )
    category_interest_counts = _get_category_interest_counts(current_user.id, db)
    user_interest_ids = _get_user_interest_ids(current_user.id, db)
    return _build_recommended_clubs(
        category_interest_counts,
        user_interest_ids,
        limit=limit_value,
        db=db,
    )


@app.get("/clubs/{club_id}", response_model=ClubOut)
def get_club(club_id: str, db: Session = Depends(get_db)):
    return _serialize_club(_get_club_or_404(club_id, db=db, active_only=True))


@app.get("/admin/clubs/{club_id}", response_model=ClubOut)
def get_club_admin(
    club_id: str,
    _admin: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    return _serialize_club(_get_club_or_404(club_id, db=db))


@app.patch("/clubs/{club_id}", response_model=ClubOut)
def update_club(
    club_id: str,
    payload: ClubUpdate,
    _admin: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    club = _get_club_or_404(club_id, db=db)
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
    if "meeting_weekday" in data:
        club.meeting_weekday = data["meeting_weekday"]
    if "meeting_start_time" in data:
        club.meeting_start_time = (
            time.fromisoformat(data["meeting_start_time"]) if data["meeting_start_time"] else None
        )
    if "meeting_end_time" in data:
        club.meeting_end_time = (
            time.fromisoformat(data["meeting_end_time"]) if data["meeting_end_time"] else None
        )

    if club.meeting_weekday is None:
        club.meeting_start_time = None
        club.meeting_end_time = None

    db.commit()
    db.refresh(club)

    return _serialize_club(club)


@app.patch("/admin/clubs/{club_id}", response_model=ClubOut)
def update_club_admin(
    club_id: str,
    payload: ClubUpdate,
    _admin: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    return update_club(club_id=club_id, payload=payload, _admin=_admin, db=db)


@app.patch("/admin/clubs/{club_id}/visibility", response_model=ClubOut)
def update_club_visibility_admin(
    club_id: str,
    payload: ClubVisibilityUpdate,
    _admin: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    club = _get_club_or_404(club_id, db=db)
    club.is_active = payload.is_active
    db.commit()
    db.refresh(club)
    return _serialize_club(club)


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
        is_active=True,
        is_online=payload.is_online if payload.is_online is not None else False,
        registration_url=payload.registration_url,
        image_url=payload.image_url,
    )

    db.add(event)
    db.commit()
    db.refresh(event)

    return _serialize_event(event)


@app.get("/events", response_model=list[EventOut])
def list_events(
    category_id: str | None = None,
    club_id: str | None = None,
    city: str | None = None,
    db: Session = Depends(get_db),
):
    events = (
        _build_events_query(
            db=db,
            category_id=category_id,
            club_id=club_id,
            city=city,
        )
        .filter(models.Event.is_active.is_(True))
        .filter(models.Event.start_time > func.now())
        .order_by(models.Event.start_time.asc())
        .all()
    )
    return [_serialize_event(event) for event in events]


@app.get("/admin/events", response_model=list[EventOut])
def list_events_admin(
    category_id: str | None = None,
    club_id: str | None = None,
    city: str | None = None,
    _admin: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    events = (
        _build_events_query(
            db=db,
            category_id=category_id,
            club_id=club_id,
            city=city,
        )
        .order_by(models.Event.start_time.desc())
        .all()
    )
    return [_serialize_event(event) for event in events]


@app.get("/events/recommended", response_model=list[RecommendedEventOut])
def list_recommended_events(
    limit: int | None = Query(default=None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Recommend upcoming events to the logged-in user using event categories plus
    the interests attached to each event's club. Only future events are considered.
    """
    limit_value = _resolve_recommendation_limit(
        limit,
        default_limit=DEFAULT_RECOMMENDED_EVENTS_LIMIT,
        max_limit=MAX_RECOMMENDED_EVENTS_LIMIT,
    )
    category_interest_counts = _get_category_interest_counts(current_user.id, db)
    user_interest_ids = _get_user_interest_ids(current_user.id, db)
    return _build_recommended_events(
        category_interest_counts,
        user_interest_ids,
        limit=limit_value,
        db=db,
    )


@app.get("/users/{user_id}/registered-events", response_model=list[RegisteredEventOut])
def list_registered_events(
    user_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_self_or_admin(user_id, current_user)

    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format.",
        )

    registrations = (
        db.query(models.UserEventRegistration)
        .options(
            joinedload(models.UserEventRegistration.event).joinedload(models.Event.category),
            joinedload(models.UserEventRegistration.event).joinedload(models.Event.club),
            joinedload(models.UserEventRegistration.event).joinedload(models.Event.registrations),
        )
        .join(models.Event, models.UserEventRegistration.event_id == models.Event.id)
        .filter(models.UserEventRegistration.user_id == user_uuid)
        .filter(models.Event.is_active.is_(True))
        .order_by(models.Event.start_time.asc())
        .all()
    )

    return [_serialize_registered_event(registration) for registration in registrations]


@app.post("/events/{event_id}/register", response_model=RegisteredEventOut)
def register_for_event(
    event_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = _get_event_or_404(event_id, db=db, active_only=True)

    event_start = event.start_time
    if event_start.tzinfo is None:
        event_start = event_start.replace(tzinfo=timezone.utc)
    if event_start <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Past events cannot be registered.",
        )

    registration = (
        db.query(models.UserEventRegistration)
        .filter(models.UserEventRegistration.user_id == current_user.id)
        .filter(models.UserEventRegistration.event_id == event.id)
        .first()
    )

    if registration is None:
        registration = models.UserEventRegistration(
            user_id=current_user.id,
            event_id=event.id,
        )
        db.add(registration)
        db.commit()

    registration = (
        db.query(models.UserEventRegistration)
        .options(
            joinedload(models.UserEventRegistration.event).joinedload(models.Event.category),
            joinedload(models.UserEventRegistration.event).joinedload(models.Event.club),
            joinedload(models.UserEventRegistration.event).joinedload(models.Event.registrations),
        )
        .filter(models.UserEventRegistration.user_id == current_user.id)
        .filter(models.UserEventRegistration.event_id == event.id)
        .first()
    )
    return _serialize_registered_event(registration)


@app.delete("/events/{event_id}/register", status_code=status.HTTP_204_NO_CONTENT)
def unregister_for_event(
    event_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = _get_event_or_404(event_id, db=db)
    registration = (
        db.query(models.UserEventRegistration)
        .filter(models.UserEventRegistration.user_id == current_user.id)
        .filter(models.UserEventRegistration.event_id == event.id)
        .first()
    )
    if registration:
        db.delete(registration)
        db.commit()
    return


@app.get("/events/{event_id}/feedback", response_model=EventFeedbackOut | None)
def get_event_feedback(
    event_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = _get_event_or_404(event_id, db=db)
    feedback = (
        db.query(models.EventFeedback)
        .options(joinedload(models.EventFeedback.event))
        .filter(models.EventFeedback.user_id == current_user.id)
        .filter(models.EventFeedback.event_id == event.id)
        .first()
    )
    return _serialize_event_feedback(feedback) if feedback else None


@app.post("/events/{event_id}/feedback", response_model=EventFeedbackOut, status_code=status.HTTP_201_CREATED)
def create_event_feedback(
    event_id: str,
    payload: FeedbackInput,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = _get_event_or_404(event_id, db=db)

    registration = (
        db.query(models.UserEventRegistration)
        .filter(models.UserEventRegistration.user_id == current_user.id)
        .filter(models.UserEventRegistration.event_id == event.id)
        .first()
    )
    if not registration:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only leave feedback for events you attended.",
        )
    if not _is_event_feedback_open(event):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Feedback opens after the event has ended.",
        )

    existing = (
        db.query(models.EventFeedback)
        .filter(models.EventFeedback.user_id == current_user.id)
        .filter(models.EventFeedback.event_id == event.id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Feedback has already been submitted for this event.",
        )

    db.add(
        models.EventFeedback(
            user_id=current_user.id,
            event_id=event.id,
            rating=payload.rating,
            comment=payload.comment,
        )
    )
    db.commit()

    feedback = (
        db.query(models.EventFeedback)
        .options(joinedload(models.EventFeedback.event))
        .filter(models.EventFeedback.user_id == current_user.id)
        .filter(models.EventFeedback.event_id == event.id)
        .first()
    )
    return _serialize_event_feedback(feedback)


@app.get("/users/{user_id}/joined-clubs", response_model=list[JoinedClubOut])
def list_joined_clubs(
    user_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Clubs this user has joined (memberships). Caller must be this user or an admin."""
    _require_self_or_admin(user_id, current_user)

    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format.",
        )

    rows = (
        db.query(models.UserClubMembership)
        .options(
            joinedload(models.UserClubMembership.club).joinedload(models.Club.category),
            joinedload(models.UserClubMembership.club).joinedload(models.Club.memberships),
        )
        .join(models.Club, models.UserClubMembership.club_id == models.Club.id)
        .filter(models.UserClubMembership.user_id == user_uuid)
        .order_by(models.Club.name.asc())
        .all()
    )
    return [_serialize_joined_club(row) for row in rows]


@app.post("/clubs/{club_id}/join", response_model=JoinedClubOut)
def join_club(
    club_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Record membership in an active club (idempotent)."""
    club = _get_club_or_404(club_id, db=db, active_only=True)

    existing = (
        db.query(models.UserClubMembership)
        .filter(models.UserClubMembership.user_id == current_user.id)
        .filter(models.UserClubMembership.club_id == club.id)
        .first()
    )
    if existing is None:
        db.add(
            models.UserClubMembership(
                user_id=current_user.id,
                club_id=club.id,
            )
        )
        db.commit()

    membership = (
        db.query(models.UserClubMembership)
        .options(
            joinedload(models.UserClubMembership.club).joinedload(models.Club.category),
            joinedload(models.UserClubMembership.club).joinedload(models.Club.memberships),
        )
        .filter(models.UserClubMembership.user_id == current_user.id)
        .filter(models.UserClubMembership.club_id == club.id)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found.")
    return _serialize_joined_club(membership)


@app.delete("/clubs/{club_id}/join", status_code=status.HTTP_204_NO_CONTENT)
def leave_club(
    club_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    club = _get_club_or_404(club_id, db=db)
    row = (
        db.query(models.UserClubMembership)
        .filter(models.UserClubMembership.user_id == current_user.id)
        .filter(models.UserClubMembership.club_id == club.id)
        .first()
    )
    if row:
        db.delete(row)
        db.commit()
    return


@app.get("/clubs/{club_id}/feedback-context", response_model=ClubFeedbackContextOut)
def get_club_feedback_context(
    club_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    club = _get_club_or_404(club_id, db=db)
    membership = (
        db.query(models.UserClubMembership)
        .options(joinedload(models.UserClubMembership.club))
        .filter(models.UserClubMembership.user_id == current_user.id)
        .filter(models.UserClubMembership.club_id == club.id)
        .first()
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only leave feedback for clubs you joined.",
        )

    submitted_feedback = (
        db.query(models.ClubActivityFeedback)
        .options(joinedload(models.ClubActivityFeedback.club))
        .filter(models.ClubActivityFeedback.user_id == current_user.id)
        .filter(models.ClubActivityFeedback.club_id == club.id)
        .order_by(models.ClubActivityFeedback.activity_start_time.desc())
        .all()
    )
    submitted_start_times = {row.activity_start_time for row in submitted_feedback}

    return ClubFeedbackContextOut(
        opportunities=_build_recent_club_feedback_opportunities(
            membership,
            submitted_start_times,
        ),
        submitted_feedback=[
            _serialize_club_activity_feedback(row) for row in submitted_feedback
        ],
    )


@app.post("/clubs/{club_id}/feedback", response_model=ClubActivityFeedbackOut, status_code=status.HTTP_201_CREATED)
def create_club_activity_feedback(
    club_id: str,
    payload: ClubActivityFeedbackCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    club = _get_club_or_404(club_id, db=db)
    membership = (
        db.query(models.UserClubMembership)
        .options(joinedload(models.UserClubMembership.club))
        .filter(models.UserClubMembership.user_id == current_user.id)
        .filter(models.UserClubMembership.club_id == club.id)
        .first()
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only leave feedback for clubs you joined.",
        )
    if not _is_valid_club_feedback_occurrence(membership, payload.activity_start_time):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Feedback can only be submitted for a past club activity you attended.",
        )

    existing = (
        db.query(models.ClubActivityFeedback)
        .filter(models.ClubActivityFeedback.user_id == current_user.id)
        .filter(models.ClubActivityFeedback.club_id == club.id)
        .filter(models.ClubActivityFeedback.activity_start_time == payload.activity_start_time)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Feedback has already been submitted for this club activity.",
        )

    db.add(
        models.ClubActivityFeedback(
            user_id=current_user.id,
            club_id=club.id,
            activity_start_time=payload.activity_start_time,
            rating=payload.rating,
            comment=payload.comment,
        )
    )
    db.commit()

    feedback = (
        db.query(models.ClubActivityFeedback)
        .options(joinedload(models.ClubActivityFeedback.club))
        .filter(models.ClubActivityFeedback.user_id == current_user.id)
        .filter(models.ClubActivityFeedback.club_id == club.id)
        .filter(models.ClubActivityFeedback.activity_start_time == payload.activity_start_time)
        .first()
    )
    return _serialize_club_activity_feedback(feedback)


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
    user_interest_ids = _get_user_interest_ids(current_user.id, db)

    return RecommendationsOut(
        clubs=_build_recommended_clubs(
            category_interest_counts,
            user_interest_ids,
            limit=club_limit_value,
            db=db,
        ),
        events=_build_recommended_events(
            category_interest_counts,
            user_interest_ids,
            limit=event_limit_value,
            db=db,
        ),
    )


@app.get("/events/{event_id}", response_model=EventOut)
def get_event(event_id: str, db: Session = Depends(get_db)):
    return _serialize_event(_get_event_or_404(event_id, db=db, active_only=True))


@app.get("/admin/events/{event_id}", response_model=EventOut)
def get_event_admin(
    event_id: str,
    _admin: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    return _serialize_event(_get_event_or_404(event_id, db=db))


@app.patch("/events/{event_id}", response_model=EventOut)
def update_event(event_id: str, payload: EventUpdate, db: Session = Depends(get_db)):
    event = _get_event_or_404(event_id, db=db)

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
    if "image_url" in data:
        event.image_url = data["image_url"]

    db.commit()
    db.refresh(event)

    return _serialize_event(event)


@app.patch("/admin/events/{event_id}", response_model=EventOut)
def update_event_admin(
    event_id: str,
    payload: EventUpdate,
    _admin: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    return update_event(event_id=event_id, payload=payload, db=db)


@app.patch("/admin/events/{event_id}/visibility", response_model=EventOut)
def update_event_visibility_admin(
    event_id: str,
    payload: EventVisibilityUpdate,
    _admin: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    event = _get_event_or_404(event_id, db=db)
    event.is_active = payload.is_active
    db.commit()
    db.refresh(event)
    return _serialize_event(event)


@app.get("/admin/feedback", response_model=AdminFeedbackSummaryOut)
def list_feedback_admin(
    _admin: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    event_feedback = (
        db.query(models.EventFeedback)
        .options(
            joinedload(models.EventFeedback.user),
            joinedload(models.EventFeedback.event),
        )
        .join(models.Event, models.EventFeedback.event_id == models.Event.id)
        .order_by(models.EventFeedback.created_at.desc())
        .all()
    )
    club_feedback = (
        db.query(models.ClubActivityFeedback)
        .options(
            joinedload(models.ClubActivityFeedback.user),
            joinedload(models.ClubActivityFeedback.club),
        )
        .join(models.Club, models.ClubActivityFeedback.club_id == models.Club.id)
        .order_by(models.ClubActivityFeedback.created_at.desc())
        .all()
    )

    return AdminFeedbackSummaryOut(
        event_feedback=[
            AdminEventFeedbackOut(
                user_id=str(row.user.id),
                user_email=row.user.email,
                user_name=_display_user_name(row.user),
                event_id=str(row.event.id),
                event_title=row.event.title,
                event_start_time=row.event.start_time.isoformat(),
                rating=row.rating,
                comment=row.comment,
                submitted_at=row.created_at.isoformat(),
            )
            for row in event_feedback
        ],
        club_activity_feedback=[
            AdminClubActivityFeedbackOut(
                user_id=str(row.user.id),
                user_email=row.user.email,
                user_name=_display_user_name(row.user),
                club_id=str(row.club.id),
                club_name=row.club.name,
                activity_start_time=row.activity_start_time.isoformat(),
                activity_end_time=(
                    _club_activity_end_time(row.club, row.activity_start_time).isoformat()
                    if _club_activity_end_time(row.club, row.activity_start_time)
                    else None
                ),
                rating=row.rating,
                comment=row.comment,
                submitted_at=row.created_at.isoformat(),
            )
            for row in club_feedback
        ],
    )


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
