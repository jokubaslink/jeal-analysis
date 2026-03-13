import hashlib
import os
import uuid

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, field_validator
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import Session

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
    name: str
    description: str | None = None
    category_id: str | None = None
    city: str | None = None
    location: str | None = None
    website_url: str | None = None
    is_active: bool | None = None


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


class EventCreate(BaseModel):
    title: str
    description: str | None = None
    category_id: str | None = None
    club_id: str | None = None
    start_time: str
    end_time: str | None = None
    city: str | None = None
    location: str | None = None
    is_online: bool | None = None
    registration_url: str | None = None


class EventUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category_id: str | None = None
    club_id: str | None = None
    start_time: str | None = None
    end_time: str | None = None
    city: str | None = None
    location: str | None = None
    is_online: bool | None = None
    registration_url: str | None = None


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


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


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

    return {"message": "Login successful", "user_id": str(user.id)}


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


@app.post("/clubs", response_model=ClubOut, status_code=status.HTTP_201_CREATED)
def create_club(payload: ClubCreate, db: Session = Depends(get_db)):
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


@app.post("/events", response_model=EventOut, status_code=status.HTTP_201_CREATED)
def create_event(payload: EventCreate, db: Session = Depends(get_db)):
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

    # when the list is empty, clear all interests for the user
    items = payload.items or []
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