import hashlib

from fastapi import Depends, FastAPI, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .database import SessionLocal
from . import models


app = FastAPI()


class UserCreate(BaseModel):
    email: str
    password: str
    first_name: str | None = None
    last_name: str | None = None
    school: str | None = None
    grade_year: int | None = None
    age_group: str | None = None
    city: str | None = None


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
    # Reuse the same logic as create_user for now
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