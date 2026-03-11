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
            "detail": "Database connection failed. Check that PostgreSQL is running and DATABASE_URL is set (e.g. port 5433 if you use a different port).",
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


class UserInterestsUpdate(BaseModel):
    interest_ids: list[str]


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


@app.post("/users/{user_id}/interests")
def set_user_interests(
    user_id: str,
    payload: UserInterestsUpdate,
    db: Session = Depends(get_db),
):
    # ensure user exists
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format.",
        )

    user = db.query(models.User).filter(models.User.id == user_uuid).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # when the list is empty, clear all interests for the user
    raw_interest_ids = payload.interest_ids or []

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

    for interest_id in interest_uuids:
        link = models.UserInterest(user_id=user_uuid, interest_id=interest_id)
        db.add(link)

    db.commit()
    return {"message": "Interests updated."}


@app.get("/users/{user_id}/interests", response_model=list[InterestOut])
def list_user_interests(user_id: str, db: Session = Depends(get_db)):
    links = (
        db.query(models.UserInterest)
        .join(models.Interest, models.UserInterest.interest_id == models.Interest.id)
        .filter(models.UserInterest.user_id == user_id)
        .all()
    )
    interests = [link.interest for link in links]
    return [
        InterestOut(
            id=str(i.id),
            category_id=str(i.category_id),
            name=i.name,
            description=i.description,
        )
        for i in interests
    ]