import hashlib
import os

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


@app.get("/users")
def list_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()