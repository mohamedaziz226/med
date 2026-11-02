"""Pytest fixtures — API de notifications isolée (SQLite en mémoire)."""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401 — enregistre tous les modèles sur Base.metadata
from app.api.v1 import notifications as notifications_api
from app.core.constants import UserRole
from app.core.security import create_access_token, hash_password
from app.database.base import Base
from app.database.dependencies import get_db
from app.models.user import User

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app = FastAPI()
app.include_router(notifications_api.router, prefix="/api/v1")
app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


@pytest.fixture()
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


def make_doctor(db, email="dr.test@example.com"):
    """Crée un user DOCTOR + son profil Doctor."""
    from app.models.doctor import Doctor

    user = User(
        email=email,
        password_hash=hash_password("Password123!"),
        first_name="Slim",
        last_name="Ben Ali",
        role=UserRole.DOCTOR,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    doctor = Doctor(
        user_id=user.id,
        specialty="Médecine générale",
        license_number=f"LIC-{user.id}",
    )
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    return user, doctor


def make_patient(db, doctor_id: int, email: str, first_name: str = "Amine", last_name: str = "Test"):
    """Create a PATIENT user + Profile Patient lié à un docteur."""
    from app.models.patient import Patient

    user = User(
        email=email,
        password_hash=hash_password("Password123!"),
        first_name=first_name,
        last_name=last_name,
        role=UserRole.PATIENT,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    patient = Patient(user_id=user.id, doctor_id=doctor_id)
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return user, patient


def make_admin(db) -> User:
    admin = User(
        email="admin.notif@example.com",
        password_hash=hash_password("Password123!"),
        first_name="Admin",
        last_name="Med",
        role=UserRole.ADMIN,
        is_active=True,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


def auth_headers(user: User) -> dict:
    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return {"Authorization": f"Bearer {token}"}


def base_payload(patient_id: int, **overrides) -> dict:
    payload = {
        "patient_id": patient_id,
        "title": "Rappel de rendez-vous",
        "message": "Bonjour Amine, votre rendez-vous est prévu le 29/08/2026 à 10:30.",
        "type": "appointment_reminder",
        "related_entity_id": 15,
        "related_entity_type": "appointment",
        "reminder_type": "j7",
    }
    payload.update(overrides)
    return payload