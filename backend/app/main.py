import base64
import hashlib
import hmac
import json
import os
import uuid
from collections import defaultdict
from datetime import datetime, time, timedelta, timezone

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator, model_validator
from sqlalchemy import cast, func
from sqlalchemy.types import Date as SqlDate
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import Session, joinedload

from .database import SessionLocal
from . import models


app = FastAPI()

PARTICIPATION_PREFERENCES = {"clubs", "events", "both"}


def _normalize_participation_preference(value: str | None) -> str:
    normalized = (value or "both").strip().lower()
    return normalized if normalized in PARTICIPATION_PREFERENCES else "both"


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
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174",
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
    participation_preference: str | None = None

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

    @field_validator("participation_preference")
    @classmethod
    def validate_participation_preference(cls, v: str | None) -> str | None:
        if v is None:
            return None
        normalized = v.strip().lower()
        if normalized not in PARTICIPATION_PREFERENCES:
            raise ValueError("Participation preference must be clubs, events, or both.")
        return normalized


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
    participation_preference: str = "both"


class UserMeOut(UserOut):
    is_admin: bool
    show_in_attendee_suggestions: bool


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
    participation_preference: str | None = None

    @field_validator("participation_preference")
    @classmethod
    def validate_participation_preference(cls, v: str | None) -> str | None:
        if v is None:
            return None
        normalized = v.strip().lower()
        if normalized not in PARTICIPATION_PREFERENCES:
            raise ValueError("Participation preference must be clubs, events, or both.")
        return normalized


class AttendeeSuggestionSettingsUpdate(BaseModel):
    show_in_attendee_suggestions: bool


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
    latitude: float | None = None
    longitude: float | None = None
    website_url: str | None = Field(None, max_length=500)
    image_url: str | None = Field(None, max_length=1000)
    is_active: bool | None = None
    meeting_weekday: int | None = Field(None, ge=0, le=6)
    meeting_start_time: str | None = None
    meeting_end_time: str | None = None

    @field_validator("latitude")
    @classmethod
    def latitude_range(cls, v: float | None) -> float | None:
        if v is not None and not (-90 <= v <= 90):
            raise ValueError("latitude must be between -90 and 90.")
        return v

    @field_validator("longitude")
    @classmethod
    def longitude_range(cls, v: float | None) -> float | None:
        if v is not None and not (-180 <= v <= 180):
            raise ValueError("longitude must be between -180 and 180.")
        return v

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

    @field_validator("image_url")
    @classmethod
    def image_url_normalize_club_create(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip()
        if not s:
            return None
        lowered = s.lower()
        if not (lowered.startswith("http://") or lowered.startswith("https://")):
            raise ValueError("image_url must be an http(s) URL.")
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
    latitude: float | None = None
    longitude: float | None = None
    website_url: str | None = None
    image_url: str | None = None
    is_active: bool | None = None
    meeting_weekday: int | None = Field(None, ge=0, le=6)
    meeting_start_time: str | None = None
    meeting_end_time: str | None = None

    @field_validator("latitude")
    @classmethod
    def latitude_range(cls, v: float | None) -> float | None:
        if v is not None and not (-90 <= v <= 90):
            raise ValueError("latitude must be between -90 and 90.")
        return v

    @field_validator("longitude")
    @classmethod
    def longitude_range(cls, v: float | None) -> float | None:
        if v is not None and not (-180 <= v <= 180):
            raise ValueError("longitude must be between -180 and 180.")
        return v

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

    @field_validator("image_url")
    @classmethod
    def image_url_normalize_club_update(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip()
        if not s:
            return None
        lowered = s.lower()
        if not (lowered.startswith("http://") or lowered.startswith("https://")):
            raise ValueError("image_url must be an http(s) URL.")
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
    latitude: float | None = None
    longitude: float | None = None
    website_url: str | None = None
    image_url: str | None = None
    is_active: bool
    member_count: int
    meeting_weekday: int | None = None
    meeting_start_time: str | None = None
    meeting_end_time: str | None = None


class JoinedClubOut(ClubOut):
    joined_at: str


class SavedClubOut(ClubOut):
    saved_at: str


class SavedEventOut(BaseModel):
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
    saved_at: str


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
    latitude: float | None = None
    longitude: float | None = None
    website_url: str | None = None
    image_url: str | None = None
    is_active: bool
    member_count: int
    meeting_weekday: int | None = None
    meeting_start_time: str | None = None
    meeting_end_time: str | None = None
    score: int
    recommendation_explanation: str


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


class CheckInTokenOut(BaseModel):
    token: str
    check_in_path: str
    qr_data: str
    title: str
    activity_start_time: str | None = None


class CheckInRequest(BaseModel):
    token: str


class CheckInOut(BaseModel):
    type: str
    title: str
    activity_start_time: str | None = None
    checked_in_at: str
    already_checked_in: bool


class AttendanceStatusOut(BaseModel):
    attended: bool
    checked_in_at: str | None = None


class EventCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(None, max_length=2000)
    category_id: str | None = None
    club_id: str | None = None
    start_time: datetime
    end_time: datetime | None = None
    city: str | None = Field(None, max_length=100)
    location: str | None = Field(None, max_length=255)
    latitude: float | None = None
    longitude: float | None = None
    is_online: bool | None = None
    registration_url: str | None = Field(None, max_length=500)
    image_url: str | None = Field(None, max_length=1000)
    max_capacity: int | None = Field(None, ge=1)

    @field_validator("latitude")
    @classmethod
    def latitude_range(cls, v: float | None) -> float | None:
        if v is not None and not (-90 <= v <= 90):
            raise ValueError("latitude must be between -90 and 90.")
        return v

    @field_validator("longitude")
    @classmethod
    def longitude_range(cls, v: float | None) -> float | None:
        if v is not None and not (-180 <= v <= 180):
            raise ValueError("longitude must be between -180 and 180.")
        return v

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
    latitude: float | None = None
    longitude: float | None = None
    is_online: bool | None = None
    registration_url: str | None = None
    image_url: str | None = None
    max_capacity: int | None = Field(None, ge=1)

    @field_validator("latitude")
    @classmethod
    def latitude_range(cls, v: float | None) -> float | None:
        if v is not None and not (-90 <= v <= 90):
            raise ValueError("latitude must be between -90 and 90.")
        return v

    @field_validator("longitude")
    @classmethod
    def longitude_range(cls, v: float | None) -> float | None:
        if v is not None and not (-180 <= v <= 180):
            raise ValueError("longitude must be between -180 and 180.")
        return v

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
    latitude: float | None = None
    longitude: float | None = None
    is_active: bool
    is_online: bool
    registration_url: str | None = None
    image_url: str | None = None
    attendee_count: int
    max_capacity: int | None = None
    remaining_capacity: int | None = None
    waitlist_count: int
    capacity_status: str


class RegisteredEventOut(EventOut):
    registered_at: str


class EventRegistrationStatusOut(EventOut):
    registration_status: str
    registered_at: str | None = None
    waitlisted_at: str | None = None
    waitlist_position: int | None = None


class WaitlistedEventOut(EventOut):
    waitlisted_at: str
    waitlist_position: int


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
    max_capacity: int | None = None
    remaining_capacity: int | None = None
    waitlist_count: int
    capacity_status: str
    score: int
    recommendation_explanation: str


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


class AdminAttendanceAttendeeOut(BaseModel):
    user_id: str
    user_email: str
    user_name: str | None = None
    checked_in_at: str
    check_in_method: str


class AdminEventAttendanceOut(BaseModel):
    event_id: str
    title: str
    registered_count: int
    checked_in_count: int
    attendees: list[AdminAttendanceAttendeeOut]


class AdminClubAttendanceSessionOut(BaseModel):
    activity_start_time: str
    checked_in_count: int
    attendees: list[AdminAttendanceAttendeeOut]


class AdminClubAttendanceOut(BaseModel):
    club_id: str
    club_name: str
    member_count: int
    sessions: list[AdminClubAttendanceSessionOut]


class AdminAttendanceDailyPointOut(BaseModel):
    date: str
    event_check_ins: int
    club_check_ins: int


class AdminAttendanceOverviewOut(BaseModel):
    daily: list[AdminAttendanceDailyPointOut]
    total_event_check_ins: int
    total_club_check_ins: int
    scope_club_id: str | None = None
    scope_club_name: str | None = None
    scope_event_id: str | None = None
    scope_event_title: str | None = None


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


class SimilarUserPublicOut(BaseModel):
    name: str | None = None
    programme: str | None = None
    faculty: str | None = None
    shared_interest_count: int
    shared_interests: list[str]


class EventAttendeeSuggestionOut(SimilarUserPublicOut):
    registered_at: str


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
        participation_preference=_normalize_participation_preference(user.participation_preference),
        is_admin=bool(user.is_admin),
        show_in_attendee_suggestions=bool(user.show_in_attendee_suggestions),
    )


def _club_member_count(club: models.Club) -> int:
    memberships = getattr(club, "memberships", None)
    return len(memberships) if memberships is not None else 0


def _event_attendee_count(event: models.Event) -> int:
    registrations = getattr(event, "registrations", None)
    return len(registrations) if registrations is not None else 0


def _event_waitlist_count(event: models.Event) -> int:
    waitlist_entries = getattr(event, "waitlist_entries", None)
    return len(waitlist_entries) if waitlist_entries is not None else 0


def _event_remaining_capacity(event: models.Event) -> int | None:
    if event.max_capacity is None:
        return None
    return max(0, event.max_capacity - _event_attendee_count(event))


def _event_capacity_status(event: models.Event) -> str:
    if event.max_capacity is None:
        return "available"
    if _event_remaining_capacity(event) == 0:
        return "full"
    return "available"


def _event_waitlist_position(entry: models.UserEventWaitlistEntry, db: Session) -> int:
    earlier_count = (
        db.query(models.UserEventWaitlistEntry)
        .filter(models.UserEventWaitlistEntry.event_id == entry.event_id)
        .filter(models.UserEventWaitlistEntry.created_at < entry.created_at)
        .count()
    )
    return earlier_count + 1


def _serialize_club(club: models.Club) -> ClubOut:
    return ClubOut(
        id=str(club.id),
        name=club.name,
        description=club.description,
        category_id=str(club.category_id) if club.category_id else None,
        category_name=club.category.name if club.category else None,
        city=club.city,
        location=club.location,
        latitude=club.latitude,
        longitude=club.longitude,
        website_url=club.website_url,
        image_url=club.image_url,
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


def _check_in_secret() -> bytes:
    return os.getenv("CHECK_IN_TOKEN_SECRET", "dev-check-in-token-secret").encode("utf-8")


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def _sign_check_in_payload(payload: dict) -> str:
    body = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    encoded_body = _b64url_encode(body)
    signature = hmac.new(_check_in_secret(), encoded_body.encode("ascii"), hashlib.sha256).digest()
    return f"{encoded_body}.{_b64url_encode(signature)}"


def _verify_check_in_token(token: str) -> dict:
    try:
        encoded_body, encoded_signature = token.split(".", 1)
        expected = hmac.new(_check_in_secret(), encoded_body.encode("ascii"), hashlib.sha256).digest()
        actual = _b64url_decode(encoded_signature)
        if not hmac.compare_digest(expected, actual):
            raise ValueError
        payload = json.loads(_b64url_decode(encoded_body).decode("utf-8"))
    except (ValueError, json.JSONDecodeError, UnicodeDecodeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid check-in code.",
        )

    if payload.get("type") not in {"event", "club"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid check-in code.",
        )
    return payload


def _event_check_in_token(event: models.Event) -> str:
    return _sign_check_in_payload({"type": "event", "event_id": str(event.id)})


def _normalize_activity_start(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def _default_club_activity_start(club: models.Club) -> datetime:
    if club.meeting_weekday is None or club.meeting_start_time is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Club needs a meeting weekday and start time before QR check-in can be generated.",
        )
    today = datetime.now(timezone.utc).date()
    candidate_date = today - timedelta(days=(today.weekday() - club.meeting_weekday) % 7)
    return datetime.combine(candidate_date, club.meeting_start_time, tzinfo=timezone.utc)


def _club_check_in_token(club: models.Club, activity_start_time: datetime) -> str:
    activity_start_time = _normalize_activity_start(activity_start_time)
    return _sign_check_in_payload(
        {
            "type": "club",
            "club_id": str(club.id),
            "activity_start_time": activity_start_time.isoformat(),
        }
    )


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
        participation_preference=_normalize_participation_preference(payload.participation_preference),
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
        participation_preference=_normalize_participation_preference(payload.participation_preference),
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


@app.patch("/me/attendee-suggestion-settings", response_model=UserMeOut)
def update_attendee_suggestion_settings(
    payload: AttendeeSuggestionSettingsUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.show_in_attendee_suggestions = payload.show_in_attendee_suggestions
    db.commit()
    db.refresh(current_user)
    return _user_to_me_out(current_user)


@app.get("/users/similar", response_model=list[SimilarUserPublicOut])
def get_similar_users_for_current_user(
    limit: int | None = Query(default=None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns privacy-safe similar user suggestions for the logged-in user.
    Only display name, study context, and shared interests are exposed.
    """
    limit_value = _resolve_recommendation_limit(
        limit,
        default_limit=DEFAULT_SIMILAR_USERS_LIMIT,
        max_limit=MAX_SIMILAR_USERS_LIMIT,
    )
    matches = _build_similar_user_matches(current_user, limit=limit_value, db=db)
    return [
        SimilarUserPublicOut(
            name=_display_user_name(user),
            programme=user.programme,
            faculty=user.faculty,
            shared_interest_count=shared_count,
            shared_interests=shared_interests,
        )
        for _score, user, shared_count, shared_interests in matches
    ]


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
        participation_preference=_normalize_participation_preference(user.participation_preference),
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
        "participation_preference",
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
        participation_preference=_normalize_participation_preference(user.participation_preference),
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
PREFERRED_RECOMMENDATION_LIMIT = 14
SECONDARY_RECOMMENDATION_LIMIT = 6


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


def _default_recommendation_limit_for_kind(
    preference: str | None,
    kind: str,
    fallback: int,
) -> int:
    normalized = _normalize_participation_preference(preference)
    if normalized == "clubs":
        return (
            PREFERRED_RECOMMENDATION_LIMIT
            if kind == "clubs"
            else SECONDARY_RECOMMENDATION_LIMIT
        )
    if normalized == "events":
        return (
            PREFERRED_RECOMMENDATION_LIMIT
            if kind == "events"
            else SECONDARY_RECOMMENDATION_LIMIT
        )
    return fallback


def _apply_participation_preference_to_score(
    score: int,
    preference: str | None,
    kind: str,
) -> int:
    normalized = _normalize_participation_preference(preference)
    multiplier = 1.0
    if normalized == kind:
        multiplier = 1.25
    elif normalized in {"clubs", "events"}:
        multiplier = 0.75
    return max(1, round(score * multiplier))


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


def _format_match_names(names: list[str], limit: int = 2) -> str:
    unique_names = sorted({name.strip() for name in names if name and name.strip()})
    if not unique_names:
        return ""

    visible_names = unique_names[:limit]
    if len(unique_names) == 1:
        return visible_names[0]
    if len(unique_names) == 2:
        return f"{visible_names[0]} and {visible_names[1]}"
    return f"{visible_names[0]}, {visible_names[1]}, and {len(unique_names) - limit} more"


def _club_matching_interest_names(
    club: models.Club,
    user_interest_ids: set[uuid.UUID],
) -> list[str]:
    if not user_interest_ids:
        return []
    return [
        link.interest.name
        for link in getattr(club, "interest_links", []) or []
        if link.interest_id in user_interest_ids and getattr(link, "interest", None)
    ]


def _append_participation_preference_reason(
    reasons: list[str],
    participation_preference: str | None,
    kind: str,
) -> None:
    if _normalize_participation_preference(participation_preference) == kind:
        reasons.append(f"fits your preference for {kind}")


def _build_recommendation_explanation(reasons: list[str]) -> str:
    if not reasons:
        return "Recommended from your saved interests."
    if len(reasons) == 1:
        return f"Recommended because it {reasons[0]}."
    return f"Recommended because it {', '.join(reasons[:-1])}, and {reasons[-1]}."


def _build_club_recommendation_explanation(
    club: models.Club,
    category_interest_counts: dict,
    user_interest_ids: set[uuid.UUID],
    participation_preference: str | None,
) -> str:
    reasons: list[str] = []
    match_names = _format_match_names(_club_matching_interest_names(club, user_interest_ids))
    if match_names:
        reasons.append(f"matches your {match_names} interests")
    elif category_interest_counts.get(club.category_id, 0) > 0:
        category_name = club.category.name if club.category else None
        if category_name:
            reasons.append(f"fits your {category_name} interest area")
        else:
            reasons.append("matches one of your interest areas")

    _append_participation_preference_reason(reasons, participation_preference, "clubs")
    return _build_recommendation_explanation(reasons)


def _event_category_match_name(
    event: models.Event,
    category_interest_counts: dict,
) -> str | None:
    event_category_score = category_interest_counts.get(event.category_id, 0)
    club_category_score = (
        category_interest_counts.get(event.club.category_id, 0) if event.club else 0
    )
    if event_category_score <= 0 and club_category_score <= 0:
        return None
    if event_category_score >= club_category_score:
        return event.category.name if event.category else None
    return event.club.category.name if event.club and event.club.category else None


def _build_event_recommendation_explanation(
    event: models.Event,
    category_interest_counts: dict,
    user_interest_ids: set[uuid.UUID],
    participation_preference: str | None,
) -> str:
    reasons: list[str] = []
    match_names = (
        _format_match_names(_club_matching_interest_names(event.club, user_interest_ids))
        if event.club
        else ""
    )
    if match_names:
        reasons.append(f"matches your {match_names} interests")
    else:
        category_name = _event_category_match_name(event, category_interest_counts)
        if category_name:
            reasons.append(f"fits your {category_name} interest area")
        else:
            reasons.append("matches one of your interest areas")

    _append_participation_preference_reason(reasons, participation_preference, "events")
    return _build_recommendation_explanation(reasons)


def _build_recommended_clubs(
    category_interest_counts: dict,
    user_interest_ids: set[uuid.UUID],
    *,
    limit: int,
    participation_preference: str | None = None,
    db: Session,
) -> list["RecommendedClubOut"]:
    if not category_interest_counts:
        return []

    clubs = (
        db.query(models.Club)
        .options(
            joinedload(models.Club.category),
            joinedload(models.Club.interest_links).joinedload(models.ClubInterest.interest),
            joinedload(models.Club.memberships),
        )
        .filter(models.Club.is_active.is_(True))
        .all()
    )

    scored: list[tuple[int, models.Club]] = []
    for club in clubs:
        base_score = _score_club_for_user(club, category_interest_counts, user_interest_ids)
        if base_score <= 0:
            continue
        score = _apply_participation_preference_to_score(
            base_score,
            participation_preference,
            "clubs",
        )
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
            image_url=c.image_url,
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
            recommendation_explanation=_build_club_recommendation_explanation(
                c,
                category_interest_counts,
                user_interest_ids,
                participation_preference,
            ),
        )
        for score, c in top
    ]


def _build_recommended_events(
    category_interest_counts: dict,
    user_interest_ids: set[uuid.UUID],
    *,
    limit: int,
    participation_preference: str | None = None,
    db: Session,
) -> list[RecommendedEventOut]:
    if not category_interest_counts:
        return []

    events = (
        db.query(models.Event)
        .options(
            joinedload(models.Event.category),
            joinedload(models.Event.club).joinedload(models.Club.category),
            joinedload(models.Event.club).joinedload(models.Club.interest_links),
            joinedload(models.Event.club)
            .joinedload(models.Club.interest_links)
            .joinedload(models.ClubInterest.interest),
            joinedload(models.Event.registrations),
            joinedload(models.Event.waitlist_entries),
        )
        .filter(models.Event.is_active.is_(True))
        .filter(models.Event.start_time > func.now())
        .all()
    )

    scored: list[tuple[int, models.Event]] = []
    for event in events:
        base_score = _score_event_for_user(event, category_interest_counts, user_interest_ids)
        if base_score <= 0:
            continue
        score = _apply_participation_preference_to_score(
            base_score,
            participation_preference,
            "events",
        )
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
            max_capacity=e.max_capacity,
            remaining_capacity=_event_remaining_capacity(e),
            waitlist_count=_event_waitlist_count(e),
            capacity_status=_event_capacity_status(e),
            score=score,
            recommendation_explanation=_build_event_recommendation_explanation(
                e,
                category_interest_counts,
                user_interest_ids,
                participation_preference,
            ),
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
            joinedload(models.Event.waitlist_entries),
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
        latitude=event.latitude,
        longitude=event.longitude,
        is_active=event.is_active,
        is_online=event.is_online,
        registration_url=event.registration_url,
        image_url=event.image_url,
        attendee_count=_event_attendee_count(event),
        max_capacity=event.max_capacity,
        remaining_capacity=_event_remaining_capacity(event),
        waitlist_count=_event_waitlist_count(event),
        capacity_status=_event_capacity_status(event),
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
        max_capacity=event.max_capacity,
        remaining_capacity=_event_remaining_capacity(event),
        waitlist_count=_event_waitlist_count(event),
        capacity_status=_event_capacity_status(event),
        registered_at=registration.created_at.isoformat(),
    )


def _serialize_event_registration_status(
    event: models.Event,
    *,
    registration_status: str,
    registered_at: datetime | None = None,
    waitlisted_at: datetime | None = None,
    waitlist_position: int | None = None,
) -> EventRegistrationStatusOut:
    return EventRegistrationStatusOut(
        **_serialize_event(event).model_dump(),
        registration_status=registration_status,
        registered_at=registered_at.isoformat() if registered_at else None,
        waitlisted_at=waitlisted_at.isoformat() if waitlisted_at else None,
        waitlist_position=waitlist_position,
    )


def _serialize_waitlisted_event(
    waitlist_entry: models.UserEventWaitlistEntry,
    db: Session,
) -> WaitlistedEventOut:
    return WaitlistedEventOut(
        **_serialize_event(waitlist_entry.event).model_dump(),
        waitlisted_at=waitlist_entry.created_at.isoformat(),
        waitlist_position=_event_waitlist_position(waitlist_entry, db),
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
            joinedload(models.Event.waitlist_entries),
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


def _build_similar_user_matches(
    current_user: models.User,
    *,
    limit: int,
    db: Session,
) -> list[tuple[float, models.User, int, list[str]]]:
    interest_rows = (
        db.query(models.Interest.id, models.Interest.name)
        .order_by(models.Interest.id)
        .all()
    )
    ordered_interest_ids = [row.id for row in interest_rows]
    interest_name_by_id = {row.id: row.name for row in interest_rows}
    if not ordered_interest_ids:
        return []

    current_interest_ids = _get_user_interest_ids(current_user.id, db)
    if not current_interest_ids:
        return []

    current_vector = _build_interest_vector(current_interest_ids, ordered_interest_ids)

    all_other_links = (
        db.query(models.UserInterest.user_id, models.UserInterest.interest_id)
        .filter(models.UserInterest.user_id != current_user.id)
        .all()
    )
    user_interest_sets: dict[uuid.UUID, set[uuid.UUID]] = {}
    for user_id, interest_id in all_other_links:
        user_interest_sets.setdefault(user_id, set()).add(interest_id)

    other_users = (
        db.query(models.User)
        .filter(models.User.id != current_user.id)
        .filter(models.User.is_active.is_(True))
        .all()
    )

    current_faculty = current_user.faculty.strip() if current_user.faculty else None
    current_programme = current_user.programme.strip() if current_user.programme else None

    matches: list[tuple[float, models.User, int, list[str]]] = []
    for user in other_users:
        other_interest_ids = user_interest_sets.get(user.id, set())
        shared_interest_ids = current_interest_ids.intersection(other_interest_ids)
        if not shared_interest_ids:
            continue

        other_vector = _build_interest_vector(other_interest_ids, ordered_interest_ids)
        score = _cosine_similarity(current_vector, other_vector)

        user_faculty = user.faculty.strip() if user.faculty else None
        user_programme = user.programme.strip() if user.programme else None
        if current_faculty and user_faculty and current_faculty == user_faculty:
            score += FACULTY_BOOST
        if current_programme and user_programme and current_programme == user_programme:
            score += PROGRAMME_BOOST
        score = min(1.0, score)

        shared_interests = [
            interest_name_by_id[interest_id]
            for interest_id in ordered_interest_ids
            if interest_id in shared_interest_ids
        ]
        matches.append((score, user, len(shared_interests), shared_interests))

    matches.sort(
        key=lambda item: (
            -item[0],
            -item[2],
            (_display_user_name(item[1]) or "").lower(),
        )
    )
    return matches[:limit]


def _build_similar_event_attendee_matches(
    event: models.Event,
    current_user: models.User,
    *,
    limit: int,
    db: Session,
) -> list[tuple[float, models.UserEventRegistration, int, list[str]]]:
    interest_rows = (
        db.query(models.Interest.id, models.Interest.name)
        .order_by(models.Interest.id)
        .all()
    )
    ordered_interest_ids = [row.id for row in interest_rows]
    interest_name_by_id = {row.id: row.name for row in interest_rows}
    if not ordered_interest_ids:
        return []

    current_interest_ids = _get_user_interest_ids(current_user.id, db)
    if not current_interest_ids:
        return []

    registrations = (
        db.query(models.UserEventRegistration)
        .options(joinedload(models.UserEventRegistration.user))
        .join(models.User, models.UserEventRegistration.user_id == models.User.id)
        .filter(models.UserEventRegistration.event_id == event.id)
        .filter(models.UserEventRegistration.user_id != current_user.id)
        .filter(models.User.is_active.is_(True))
        .filter(models.User.show_in_attendee_suggestions.is_(True))
        .all()
    )
    if not registrations:
        return []

    attendee_user_ids = [registration.user_id for registration in registrations]
    attendee_interest_links = (
        db.query(models.UserInterest.user_id, models.UserInterest.interest_id)
        .filter(models.UserInterest.user_id.in_(attendee_user_ids))
        .all()
    )
    user_interest_sets: dict[uuid.UUID, set[uuid.UUID]] = {}
    for user_id, interest_id in attendee_interest_links:
        user_interest_sets.setdefault(user_id, set()).add(interest_id)

    current_vector = _build_interest_vector(current_interest_ids, ordered_interest_ids)
    current_faculty = current_user.faculty.strip() if current_user.faculty else None
    current_programme = current_user.programme.strip() if current_user.programme else None

    matches: list[tuple[float, models.UserEventRegistration, int, list[str]]] = []
    for registration in registrations:
        attendee = registration.user
        attendee_interest_ids = user_interest_sets.get(registration.user_id, set())
        shared_interest_ids = current_interest_ids.intersection(attendee_interest_ids)
        if not shared_interest_ids:
            continue

        attendee_vector = _build_interest_vector(attendee_interest_ids, ordered_interest_ids)
        score = _cosine_similarity(current_vector, attendee_vector)

        attendee_faculty = attendee.faculty.strip() if attendee.faculty else None
        attendee_programme = attendee.programme.strip() if attendee.programme else None
        if current_faculty and attendee_faculty and current_faculty == attendee_faculty:
            score += FACULTY_BOOST
        if current_programme and attendee_programme and current_programme == attendee_programme:
            score += PROGRAMME_BOOST
        score = min(1.0, score)

        shared_interests = [
            interest_name_by_id[interest_id]
            for interest_id in ordered_interest_ids
            if interest_id in shared_interest_ids
        ]
        matches.append((score, registration, len(shared_interests), shared_interests))

    matches.sort(
        key=lambda item: (
            -item[0],
            -item[2],
            (_display_user_name(item[1].user) or "").lower(),
            item[1].created_at,
        )
    )
    return matches[:limit]


@app.get("/users/{user_id}/similar-users", response_model=list[SimilarUserOut])
def get_similar_users(
    user_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format.",
        )
    _require_self_or_admin(str(user_uuid), current_user)

    current_user = db.query(models.User).filter(models.User.id == user_uuid).first()
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    matches = _build_similar_user_matches(
        current_user,
        limit=MAX_SIMILAR_USERS_LIMIT,
        db=db,
    )
    results = []
    for score, user, shared_count, _shared_interests in matches:
        results.append(
            SimilarUserOut(
                user_id=str(user.id),
                score=round(score, 4),
                faculty=user.faculty,
                programme=user.programme,
                shared_interest_count=shared_count,
            )
        )

    return results


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
        latitude=payload.latitude,
        longitude=payload.longitude,
        website_url=payload.website_url,
        image_url=payload.image_url,
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
        default_limit=_default_recommendation_limit_for_kind(
            current_user.participation_preference,
            "clubs",
            DEFAULT_RECOMMENDED_CLUBS_LIMIT,
        ),
        max_limit=MAX_RECOMMENDED_CLUBS_LIMIT,
    )
    category_interest_counts = _get_category_interest_counts(current_user.id, db)
    user_interest_ids = _get_user_interest_ids(current_user.id, db)
    return _build_recommended_clubs(
        category_interest_counts,
        user_interest_ids,
        limit=limit_value,
        participation_preference=current_user.participation_preference,
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
    if "latitude" in data:
        club.latitude = data["latitude"]
    if "longitude" in data:
        club.longitude = data["longitude"]
    if "website_url" in data:
        club.website_url = data["website_url"]
    if "image_url" in data:
        club.image_url = data["image_url"]
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
        latitude=payload.latitude,
        longitude=payload.longitude,
        is_active=True,
        is_online=payload.is_online if payload.is_online is not None else False,
        registration_url=payload.registration_url,
        image_url=payload.image_url,
        max_capacity=payload.max_capacity,
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
        default_limit=_default_recommendation_limit_for_kind(
            current_user.participation_preference,
            "events",
            DEFAULT_RECOMMENDED_EVENTS_LIMIT,
        ),
        max_limit=MAX_RECOMMENDED_EVENTS_LIMIT,
    )
    category_interest_counts = _get_category_interest_counts(current_user.id, db)
    user_interest_ids = _get_user_interest_ids(current_user.id, db)
    return _build_recommended_events(
        category_interest_counts,
        user_interest_ids,
        limit=limit_value,
        participation_preference=current_user.participation_preference,
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
            joinedload(models.UserEventRegistration.event).joinedload(models.Event.waitlist_entries),
        )
        .join(models.Event, models.UserEventRegistration.event_id == models.Event.id)
        .filter(models.UserEventRegistration.user_id == user_uuid)
        .filter(models.Event.is_active.is_(True))
        .order_by(models.Event.start_time.asc())
        .all()
    )

    return [_serialize_registered_event(registration) for registration in registrations]


@app.get("/users/{user_id}/waitlisted-events", response_model=list[WaitlistedEventOut])
def list_waitlisted_events(
    user_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format.",
        )

    if current_user.id != user_uuid and not bool(current_user.is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own waitlisted events.",
        )

    waitlist_entries = (
        db.query(models.UserEventWaitlistEntry)
        .options(
            joinedload(models.UserEventWaitlistEntry.event).joinedload(models.Event.category),
            joinedload(models.UserEventWaitlistEntry.event).joinedload(models.Event.club),
            joinedload(models.UserEventWaitlistEntry.event).joinedload(models.Event.registrations),
            joinedload(models.UserEventWaitlistEntry.event).joinedload(models.Event.waitlist_entries),
        )
        .join(models.Event, models.UserEventWaitlistEntry.event_id == models.Event.id)
        .filter(models.UserEventWaitlistEntry.user_id == user_uuid)
        .order_by(models.Event.start_time.asc())
        .all()
    )
    return [_serialize_waitlisted_event(entry, db) for entry in waitlist_entries]


def _promote_next_waitlisted_user(event_id: uuid.UUID, db: Session) -> None:
    event = (
        db.query(models.Event)
        .filter(models.Event.id == event_id)
        .first()
    )
    if not event or event.max_capacity is None:
        return

    registered_count = (
        db.query(models.UserEventRegistration)
        .filter(models.UserEventRegistration.event_id == event_id)
        .count()
    )
    if registered_count >= event.max_capacity:
        return

    next_entry = (
        db.query(models.UserEventWaitlistEntry)
        .filter(models.UserEventWaitlistEntry.event_id == event_id)
        .order_by(models.UserEventWaitlistEntry.created_at.asc())
        .first()
    )
    if not next_entry:
        return

    existing_registration = (
        db.query(models.UserEventRegistration)
        .filter(models.UserEventRegistration.user_id == next_entry.user_id)
        .filter(models.UserEventRegistration.event_id == event_id)
        .first()
    )
    if existing_registration is None:
        db.add(
            models.UserEventRegistration(
                user_id=next_entry.user_id,
                event_id=event_id,
            )
        )
    db.delete(next_entry)


@app.post("/events/{event_id}/register", response_model=EventRegistrationStatusOut)
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
    waitlist_entry = (
        db.query(models.UserEventWaitlistEntry)
        .filter(models.UserEventWaitlistEntry.user_id == current_user.id)
        .filter(models.UserEventWaitlistEntry.event_id == event.id)
        .first()
    )

    if registration is not None:
        return _serialize_event_registration_status(
            event,
            registration_status="registered",
            registered_at=registration.created_at,
        )

    if _event_remaining_capacity(event) != 0 and _event_waitlist_count(event) > 0:
        _promote_next_waitlisted_user(event.id, db)
        db.commit()
        event = _get_event_or_404(event_id, db=db, active_only=True)
        registration = (
            db.query(models.UserEventRegistration)
            .filter(models.UserEventRegistration.user_id == current_user.id)
            .filter(models.UserEventRegistration.event_id == event.id)
            .first()
        )
        waitlist_entry = (
            db.query(models.UserEventWaitlistEntry)
            .filter(models.UserEventWaitlistEntry.user_id == current_user.id)
            .filter(models.UserEventWaitlistEntry.event_id == event.id)
            .first()
        )
        if registration is not None:
            return _serialize_event_registration_status(
                event,
                registration_status="registered",
                registered_at=registration.created_at,
            )

    if _event_remaining_capacity(event) == 0:
        if waitlist_entry is None:
            waitlist_entry = models.UserEventWaitlistEntry(
                user_id=current_user.id,
                event_id=event.id,
            )
            db.add(waitlist_entry)
            db.commit()
            db.refresh(waitlist_entry)

        event = _get_event_or_404(event_id, db=db, active_only=True)
        return _serialize_event_registration_status(
            event,
            registration_status="waitlisted",
            waitlisted_at=waitlist_entry.created_at,
            waitlist_position=_event_waitlist_position(waitlist_entry, db),
        )

    if waitlist_entry is not None:
        db.delete(waitlist_entry)

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
            joinedload(models.UserEventRegistration.event).joinedload(models.Event.waitlist_entries),
        )
        .filter(models.UserEventRegistration.user_id == current_user.id)
        .filter(models.UserEventRegistration.event_id == event.id)
        .first()
    )
    return _serialize_event_registration_status(
        registration.event,
        registration_status="registered",
        registered_at=registration.created_at,
    )


@app.delete("/events/{event_id}/register", response_model=EventRegistrationStatusOut)
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
        db.flush()
        _promote_next_waitlisted_user(event.id, db)
        db.commit()
    else:
        waitlist_entry = (
            db.query(models.UserEventWaitlistEntry)
            .filter(models.UserEventWaitlistEntry.user_id == current_user.id)
            .filter(models.UserEventWaitlistEntry.event_id == event.id)
            .first()
        )
        if waitlist_entry:
            db.delete(waitlist_entry)
            db.commit()

    event = _get_event_or_404(event_id, db=db)
    current_registration = (
        db.query(models.UserEventRegistration)
        .filter(models.UserEventRegistration.user_id == current_user.id)
        .filter(models.UserEventRegistration.event_id == event.id)
        .first()
    )
    current_waitlist_entry = (
        db.query(models.UserEventWaitlistEntry)
        .filter(models.UserEventWaitlistEntry.user_id == current_user.id)
        .filter(models.UserEventWaitlistEntry.event_id == event.id)
        .first()
    )
    if current_registration:
        return _serialize_event_registration_status(
            event,
            registration_status="registered",
            registered_at=current_registration.created_at,
        )
    if current_waitlist_entry:
        return _serialize_event_registration_status(
            event,
            registration_status="waitlisted",
            waitlisted_at=current_waitlist_entry.created_at,
            waitlist_position=_event_waitlist_position(current_waitlist_entry, db),
        )
    return _serialize_event_registration_status(event, registration_status="none")


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


@app.get("/events/{event_id}/attendance", response_model=AttendanceStatusOut)
def get_event_attendance(
    event_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = _get_event_or_404(event_id, db=db)
    attendance = (
        db.query(models.EventAttendance)
        .filter(models.EventAttendance.user_id == current_user.id)
        .filter(models.EventAttendance.event_id == event.id)
        .first()
    )
    return AttendanceStatusOut(
        attended=attendance is not None,
        checked_in_at=attendance.checked_in_at.isoformat() if attendance else None,
    )


@app.get("/events/{event_id}/similar-attendees", response_model=list[EventAttendeeSuggestionOut])
def get_event_similar_attendees(
    event_id: str,
    limit: int | None = Query(default=None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = _get_event_or_404(event_id, db=db, active_only=True)
    limit_value = _resolve_recommendation_limit(
        limit,
        default_limit=DEFAULT_SIMILAR_USERS_LIMIT,
        max_limit=MAX_SIMILAR_USERS_LIMIT,
    )
    matches = _build_similar_event_attendee_matches(
        event,
        current_user,
        limit=limit_value,
        db=db,
    )
    return [
        EventAttendeeSuggestionOut(
            name=_display_user_name(registration.user),
            programme=registration.user.programme,
            faculty=registration.user.faculty,
            shared_interest_count=shared_count,
            shared_interests=shared_interests,
            registered_at=registration.created_at.isoformat(),
        )
        for _score, registration, shared_count, shared_interests in matches
    ]


@app.get("/admin/events/{event_id}/check-in-token", response_model=CheckInTokenOut)
def get_event_check_in_token(
    event_id: str,
    _admin: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    event = _get_event_or_404(event_id, db=db)
    token = _event_check_in_token(event)
    return CheckInTokenOut(
        token=token,
        check_in_path=f"/check-in?token={token}",
        qr_data=f"/check-in?token={token}",
        title=event.title,
    )


@app.get("/admin/clubs/{club_id}/check-in-token", response_model=CheckInTokenOut)
def get_club_check_in_token(
    club_id: str,
    activity_start_time: datetime | None = Query(default=None),
    _admin: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    club = _get_club_or_404(club_id, db=db)
    activity_start = (
        _normalize_activity_start(activity_start_time)
        if activity_start_time is not None
        else _default_club_activity_start(club)
    )
    token = _club_check_in_token(club, activity_start)
    return CheckInTokenOut(
        token=token,
        check_in_path=f"/check-in?token={token}",
        qr_data=f"/check-in?token={token}",
        title=club.name,
        activity_start_time=activity_start.isoformat(),
    )


@app.get("/admin/events/{event_id}/attendance", response_model=AdminEventAttendanceOut)
def admin_get_event_attendance(
    event_id: str,
    brief: bool = Query(default=False),
    _admin: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    event = _get_event_or_404(event_id, db=db)
    registered_count = (
        db.query(models.UserEventRegistration)
        .filter(models.UserEventRegistration.event_id == event.id)
        .count()
    )
    rows = (
        db.query(models.EventAttendance)
        .options(joinedload(models.EventAttendance.user))
        .filter(models.EventAttendance.event_id == event.id)
        .order_by(models.EventAttendance.checked_in_at.desc())
        .all()
    )
    checked_in_count = len(rows)
    attendees: list[AdminAttendanceAttendeeOut] = []
    if not brief:
        attendees = [
            AdminAttendanceAttendeeOut(
                user_id=str(row.user_id),
                user_email=row.user.email,
                user_name=_display_user_name(row.user),
                checked_in_at=row.checked_in_at.isoformat(),
                check_in_method=row.check_in_method,
            )
            for row in rows
        ]
    return AdminEventAttendanceOut(
        event_id=str(event.id),
        title=event.title,
        registered_count=registered_count,
        checked_in_count=checked_in_count,
        attendees=attendees,
    )


@app.get("/admin/clubs/{club_id}/attendance", response_model=AdminClubAttendanceOut)
def admin_get_club_attendance(
    club_id: str,
    activity_start_time: datetime | None = Query(default=None),
    brief: bool = Query(default=False),
    _admin: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    club = _get_club_or_404(club_id, db=db)
    member_count = (
        db.query(models.UserClubMembership)
        .filter(models.UserClubMembership.club_id == club.id)
        .count()
    )

    if activity_start_time is not None:
        ast = _normalize_activity_start(activity_start_time)
        rows = (
            db.query(models.ClubActivityAttendance)
            .options(joinedload(models.ClubActivityAttendance.user))
            .filter(models.ClubActivityAttendance.club_id == club.id)
            .filter(models.ClubActivityAttendance.activity_start_time == ast)
            .order_by(models.ClubActivityAttendance.checked_in_at.desc())
            .all()
        )
        grouped: dict[datetime, list[models.ClubActivityAttendance]] = {ast: rows}
    else:
        session_times_rows = (
            db.query(models.ClubActivityAttendance.activity_start_time)
            .filter(models.ClubActivityAttendance.club_id == club.id)
            .distinct()
            .order_by(models.ClubActivityAttendance.activity_start_time.desc())
            .limit(50)
            .all()
        )
        session_times = [t[0] for t in session_times_rows]
        if not session_times:
            return AdminClubAttendanceOut(
                club_id=str(club.id),
                club_name=club.name,
                member_count=member_count,
                sessions=[],
            )
        rows = (
            db.query(models.ClubActivityAttendance)
            .options(joinedload(models.ClubActivityAttendance.user))
            .filter(models.ClubActivityAttendance.club_id == club.id)
            .filter(models.ClubActivityAttendance.activity_start_time.in_(session_times))
            .order_by(
                models.ClubActivityAttendance.activity_start_time.desc(),
                models.ClubActivityAttendance.checked_in_at.desc(),
            )
            .all()
        )
        grouped = defaultdict(list)
        for row in rows:
            grouped[row.activity_start_time].append(row)

    sessions_out: list[AdminClubAttendanceSessionOut] = []
    for start_key in sorted(grouped.keys(), reverse=True):
        group_rows = grouped[start_key]
        attendees_list: list[AdminAttendanceAttendeeOut] = []
        if not brief:
            attendees_list = [
                AdminAttendanceAttendeeOut(
                    user_id=str(entry.user_id),
                    user_email=entry.user.email,
                    user_name=_display_user_name(entry.user),
                    checked_in_at=entry.checked_in_at.isoformat(),
                    check_in_method=entry.check_in_method,
                )
                for entry in sorted(group_rows, key=lambda e: e.checked_in_at)
            ]
        sessions_out.append(
            AdminClubAttendanceSessionOut(
                activity_start_time=start_key.isoformat(),
                checked_in_count=len(group_rows),
                attendees=attendees_list,
            )
        )

    return AdminClubAttendanceOut(
        club_id=str(club.id),
        club_name=club.name,
        member_count=member_count,
        sessions=sessions_out,
    )


@app.get("/admin/attendance/overview", response_model=AdminAttendanceOverviewOut)
def admin_attendance_overview(
    days: int = Query(default=30, ge=1, le=366),
    club_id: str | None = Query(default=None),
    event_id: str | None = Query(default=None),
    _admin: models.User = Depends(require_admin_user),
    db: Session = Depends(get_db),
):
    """Daily QR check-in counts (UTC calendar days) for admin dashboard charts."""
    club_raw = club_id.strip() if club_id else ""
    event_raw = event_id.strip() if event_id else ""
    if club_raw and event_raw:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Specify either club_id or event_id, not both.",
        )

    now = datetime.now(timezone.utc)
    since_dt = now - timedelta(days=days)
    end_date = now.date()
    start_date = end_date - timedelta(days=days - 1)

    scope_club_uuid = None
    scope_club_id_out: str | None = None
    scope_club_name_out: str | None = None
    if club_raw:
        scoped_club = _get_club_or_404(club_raw, db=db)
        scope_club_uuid = scoped_club.id
        scope_club_id_out = str(scoped_club.id)
        scope_club_name_out = scoped_club.name

    scope_event_uuid = None
    scope_event_id_out: str | None = None
    scope_event_title_out: str | None = None
    if event_raw:
        scoped_event = _get_event_or_404(event_raw, db=db)
        scope_event_uuid = scoped_event.id
        scope_event_id_out = str(scoped_event.id)
        scope_event_title_out = scoped_event.title

    if scope_event_uuid is not None:
        event_daily = (
            db.query(
                cast(models.EventAttendance.checked_in_at, SqlDate).label("day"),
                func.count(models.EventAttendance.user_id),
            )
            .filter(models.EventAttendance.checked_in_at >= since_dt)
            .filter(models.EventAttendance.event_id == scope_event_uuid)
            .group_by(cast(models.EventAttendance.checked_in_at, SqlDate))
            .all()
        )
    elif scope_club_uuid is None:
        event_daily = (
            db.query(
                cast(models.EventAttendance.checked_in_at, SqlDate).label("day"),
                func.count(models.EventAttendance.user_id),
            )
            .filter(models.EventAttendance.checked_in_at >= since_dt)
            .group_by(cast(models.EventAttendance.checked_in_at, SqlDate))
            .all()
        )
    else:
        event_daily = []

    club_daily_query = (
        db.query(
            cast(models.ClubActivityAttendance.checked_in_at, SqlDate).label("day"),
            func.count(models.ClubActivityAttendance.user_id),
        )
        .filter(models.ClubActivityAttendance.checked_in_at >= since_dt)
    )
    if scope_club_uuid is not None:
        club_daily = (
            club_daily_query.filter(models.ClubActivityAttendance.club_id == scope_club_uuid)
            .group_by(cast(models.ClubActivityAttendance.checked_in_at, SqlDate))
            .all()
        )
    elif scope_event_uuid is None:
        club_daily = club_daily_query.group_by(cast(models.ClubActivityAttendance.checked_in_at, SqlDate)).all()
    else:
        club_daily = []

    def _day_key(day: object):
        if isinstance(day, datetime):
            return day.date()
        return day

    event_map = {_day_key(row[0]): int(row[1]) for row in event_daily if row[0] is not None}
    club_map = {_day_key(row[0]): int(row[1]) for row in club_daily if row[0] is not None}

    daily_out: list[AdminAttendanceDailyPointOut] = []
    total_event = 0
    total_club = 0
    cursor = start_date
    while cursor <= end_date:
        ev_c = event_map.get(cursor, 0)
        cl_c = club_map.get(cursor, 0)
        total_event += ev_c
        total_club += cl_c
        daily_out.append(
            AdminAttendanceDailyPointOut(
                date=cursor.isoformat(),
                event_check_ins=ev_c,
                club_check_ins=cl_c,
            )
        )
        cursor += timedelta(days=1)

    return AdminAttendanceOverviewOut(
        daily=daily_out,
        total_event_check_ins=total_event,
        total_club_check_ins=total_club,
        scope_club_id=scope_club_id_out,
        scope_club_name=scope_club_name_out,
        scope_event_id=scope_event_id_out,
        scope_event_title=scope_event_title_out,
    )


@app.post("/attendance/check-in", response_model=CheckInOut)
def check_in_with_token(
    payload: CheckInRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = _verify_check_in_token(payload.token)
    now = datetime.now(timezone.utc)

    if data["type"] == "event":
        event = _get_event_or_404(data.get("event_id", ""), db=db)
        registration = (
            db.query(models.UserEventRegistration)
            .filter(models.UserEventRegistration.user_id == current_user.id)
            .filter(models.UserEventRegistration.event_id == event.id)
            .first()
        )
        if not registration:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Register for this event before checking in.",
            )

        attendance = (
            db.query(models.EventAttendance)
            .filter(models.EventAttendance.user_id == current_user.id)
            .filter(models.EventAttendance.event_id == event.id)
            .first()
        )
        already_checked_in = attendance is not None
        if attendance is None:
            attendance = models.EventAttendance(
                user_id=current_user.id,
                event_id=event.id,
                checked_in_at=now,
                check_in_method="qr",
            )
            db.add(attendance)
            db.commit()
            db.refresh(attendance)

        return CheckInOut(
            type="event",
            title=event.title,
            checked_in_at=attendance.checked_in_at.isoformat(),
            already_checked_in=already_checked_in,
        )

    club = _get_club_or_404(data.get("club_id", ""), db=db)
    try:
        activity_start = datetime.fromisoformat(data.get("activity_start_time", ""))
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid club activity check-in code.",
        )
    activity_start = _normalize_activity_start(activity_start)

    membership = (
        db.query(models.UserClubMembership)
        .filter(models.UserClubMembership.user_id == current_user.id)
        .filter(models.UserClubMembership.club_id == club.id)
        .first()
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Join this club before checking in.",
        )
    if not _is_valid_club_feedback_occurrence(membership, activity_start):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This check-in code is not for a valid past club activity.",
        )

    attendance = (
        db.query(models.ClubActivityAttendance)
        .filter(models.ClubActivityAttendance.user_id == current_user.id)
        .filter(models.ClubActivityAttendance.club_id == club.id)
        .filter(models.ClubActivityAttendance.activity_start_time == activity_start)
        .first()
    )
    already_checked_in = attendance is not None
    if attendance is None:
        attendance = models.ClubActivityAttendance(
            user_id=current_user.id,
            club_id=club.id,
            activity_start_time=activity_start,
            checked_in_at=now,
            check_in_method="qr",
        )
        db.add(attendance)
        db.commit()
        db.refresh(attendance)

    return CheckInOut(
        type="club",
        title=club.name,
        activity_start_time=activity_start.isoformat(),
        checked_in_at=attendance.checked_in_at.isoformat(),
        already_checked_in=already_checked_in,
    )


@app.post("/events/{event_id}/feedback", response_model=EventFeedbackOut, status_code=status.HTTP_201_CREATED)
def create_event_feedback(
    event_id: str,
    payload: FeedbackInput,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = _get_event_or_404(event_id, db=db)

    attendance = (
        db.query(models.EventAttendance)
        .filter(models.EventAttendance.user_id == current_user.id)
        .filter(models.EventAttendance.event_id == event.id)
        .first()
    )
    if not attendance:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Check in at this event before leaving feedback.",
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


# ---------------------------------------------------------------------------
# Saved clubs
# ---------------------------------------------------------------------------

def _serialize_saved_club(row: models.UserSavedClub) -> SavedClubOut:
    return SavedClubOut(
        **_serialize_club(row.club).model_dump(),
        saved_at=row.created_at.isoformat(),
    )


@app.get("/users/{user_id}/saved-clubs", response_model=list[SavedClubOut])
def list_saved_clubs(
    user_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_self_or_admin(user_id, current_user)

    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID format.")

    rows = (
        db.query(models.UserSavedClub)
        .options(
            joinedload(models.UserSavedClub.club).joinedload(models.Club.category),
            joinedload(models.UserSavedClub.club).joinedload(models.Club.memberships),
        )
        .join(models.Club, models.UserSavedClub.club_id == models.Club.id)
        .filter(models.UserSavedClub.user_id == user_uuid)
        .order_by(models.Club.name.asc())
        .all()
    )
    return [_serialize_saved_club(row) for row in rows]


@app.post("/clubs/{club_id}/save", response_model=SavedClubOut)
def save_club(
    club_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    club = _get_club_or_404(club_id, db=db)

    existing = (
        db.query(models.UserSavedClub)
        .filter(models.UserSavedClub.user_id == current_user.id)
        .filter(models.UserSavedClub.club_id == club.id)
        .first()
    )
    if existing is None:
        db.add(models.UserSavedClub(user_id=current_user.id, club_id=club.id))
        db.commit()

    row = (
        db.query(models.UserSavedClub)
        .options(
            joinedload(models.UserSavedClub.club).joinedload(models.Club.category),
            joinedload(models.UserSavedClub.club).joinedload(models.Club.memberships),
        )
        .filter(models.UserSavedClub.user_id == current_user.id)
        .filter(models.UserSavedClub.club_id == club.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found.")
    return _serialize_saved_club(row)


@app.delete("/clubs/{club_id}/save", status_code=status.HTTP_204_NO_CONTENT)
def unsave_club(
    club_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    club = _get_club_or_404(club_id, db=db)
    row = (
        db.query(models.UserSavedClub)
        .filter(models.UserSavedClub.user_id == current_user.id)
        .filter(models.UserSavedClub.club_id == club.id)
        .first()
    )
    if row:
        db.delete(row)
        db.commit()
    return


# ---------------------------------------------------------------------------
# Saved events
# ---------------------------------------------------------------------------

def _serialize_saved_event(row: models.UserSavedEvent) -> SavedEventOut:
    event = row.event
    return SavedEventOut(
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
        is_active=bool(event.is_active),
        is_online=bool(event.is_online),
        registration_url=event.registration_url,
        image_url=event.image_url,
        attendee_count=_event_attendee_count(event),
        saved_at=row.created_at.isoformat(),
    )


@app.get("/users/{user_id}/saved-events", response_model=list[SavedEventOut])
def list_saved_events(
    user_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_self_or_admin(user_id, current_user)

    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID format.")

    rows = (
        db.query(models.UserSavedEvent)
        .options(
            joinedload(models.UserSavedEvent.event).joinedload(models.Event.category),
            joinedload(models.UserSavedEvent.event).joinedload(models.Event.club),
            joinedload(models.UserSavedEvent.event).joinedload(models.Event.registrations),
        )
        .join(models.Event, models.UserSavedEvent.event_id == models.Event.id)
        .filter(models.UserSavedEvent.user_id == user_uuid)
        .order_by(models.Event.start_time.asc())
        .all()
    )
    return [_serialize_saved_event(row) for row in rows]


@app.post("/events/{event_id}/save", response_model=SavedEventOut)
def save_event(
    event_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = _get_event_or_404(event_id, db=db)

    existing = (
        db.query(models.UserSavedEvent)
        .filter(models.UserSavedEvent.user_id == current_user.id)
        .filter(models.UserSavedEvent.event_id == event.id)
        .first()
    )
    if existing is None:
        db.add(models.UserSavedEvent(user_id=current_user.id, event_id=event.id))
        db.commit()

    row = (
        db.query(models.UserSavedEvent)
        .options(
            joinedload(models.UserSavedEvent.event).joinedload(models.Event.category),
            joinedload(models.UserSavedEvent.event).joinedload(models.Event.club),
            joinedload(models.UserSavedEvent.event).joinedload(models.Event.registrations),
        )
        .filter(models.UserSavedEvent.user_id == current_user.id)
        .filter(models.UserSavedEvent.event_id == event.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")
    return _serialize_saved_event(row)


@app.delete("/events/{event_id}/save", status_code=status.HTTP_204_NO_CONTENT)
def unsave_event(
    event_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = _get_event_or_404(event_id, db=db)
    row = (
        db.query(models.UserSavedEvent)
        .filter(models.UserSavedEvent.user_id == current_user.id)
        .filter(models.UserSavedEvent.event_id == event.id)
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
    attended_activities = (
        db.query(models.ClubActivityAttendance)
        .filter(models.ClubActivityAttendance.user_id == current_user.id)
        .filter(models.ClubActivityAttendance.club_id == club.id)
        .order_by(models.ClubActivityAttendance.activity_start_time.desc())
        .limit(12)
        .all()
    )

    return ClubFeedbackContextOut(
        opportunities=[
            ClubFeedbackOpportunityOut(
                activity_start_time=row.activity_start_time.isoformat(),
                activity_end_time=(
                    _club_activity_end_time(club, row.activity_start_time).isoformat()
                    if _club_activity_end_time(club, row.activity_start_time)
                    else None
                ),
                already_submitted=row.activity_start_time in submitted_start_times,
            )
            for row in attended_activities
        ],
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
    attendance = (
        db.query(models.ClubActivityAttendance)
        .filter(models.ClubActivityAttendance.user_id == current_user.id)
        .filter(models.ClubActivityAttendance.club_id == club.id)
        .filter(models.ClubActivityAttendance.activity_start_time == payload.activity_start_time)
        .first()
    )
    if not attendance:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Check in at this club activity before leaving feedback.",
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
        default_limit=_default_recommendation_limit_for_kind(
            current_user.participation_preference,
            "clubs",
            DEFAULT_RECOMMENDED_CLUBS_LIMIT,
        ),
        max_limit=MAX_RECOMMENDED_CLUBS_LIMIT,
    )
    event_limit_value = _resolve_recommendation_limit(
        event_limit,
        default_limit=_default_recommendation_limit_for_kind(
            current_user.participation_preference,
            "events",
            DEFAULT_RECOMMENDED_EVENTS_LIMIT,
        ),
        max_limit=MAX_RECOMMENDED_EVENTS_LIMIT,
    )
    category_interest_counts = _get_category_interest_counts(current_user.id, db)
    user_interest_ids = _get_user_interest_ids(current_user.id, db)

    return RecommendationsOut(
        clubs=_build_recommended_clubs(
            category_interest_counts,
            user_interest_ids,
            limit=club_limit_value,
            participation_preference=current_user.participation_preference,
            db=db,
        ),
        events=_build_recommended_events(
            category_interest_counts,
            user_interest_ids,
            limit=event_limit_value,
            participation_preference=current_user.participation_preference,
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
    if "latitude" in data:
        event.latitude = data["latitude"]
    if "longitude" in data:
        event.longitude = data["longitude"]
    if "is_online" in data and data["is_online"] is not None:
        event.is_online = data["is_online"]
    if "registration_url" in data:
        event.registration_url = data["registration_url"]
    if "image_url" in data:
        event.image_url = data["image_url"]
    if "max_capacity" in data:
        event.max_capacity = data["max_capacity"]

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
