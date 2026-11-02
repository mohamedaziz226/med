"""Tests P1 — fuseau métier Africa/Tunis pour les rendez-vous.

Convention vérifiée :
  - une heure saisie SANS fuseau ("2030-06-10T10:00:00") est interprétée comme
    10:00 heure métier Africa/Tunis et stockée comme l'instant UTC 09:00Z ;
  - une heure AVEC offset explicite ("...+01:00") donne le même instant ;
  - l'aller-retour affichage redonne bien 10:00 Africa/Tunis (et non 12:00) ;
  - deux représentations du même instant se détectent comme conflit.
"""

from datetime import datetime

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401 — enregistre tous les modèles sur Base.metadata
from app.api.deps import get_db
from app.api.v1 import appointments as appointments_api
from app.core.business_tz import BUSINESS_TZ, to_business_naive
from app.core.constants import AppointmentStatus, UserRole
from app.core.security import create_access_token, hash_password
from app.models.appointment import Appointment
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
app.include_router(appointments_api.router, prefix="/api/v1")
app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


@pytest.fixture()
def db():
    from app.database.base import Base

    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


def _auth_headers(user: User) -> dict:
    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return {"Authorization": f"Bearer {token}"}


def _make_doctor(db, email):
    from app.models.doctor import Doctor

    user = User(
        email=email,
        password_hash=hash_password("Password123!"),
        first_name="Test",
        last_name="Doctor",
        role=UserRole.DOCTOR,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    doctor = Doctor(user_id=user.id, specialty="Médecine générale", license_number=f"LIC-{user.id}")
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    return doctor


def _make_patient(db, doctor, email):
    from app.models.patient import Patient

    user = User(
        email=email,
        password_hash=hash_password("Password123!"),
        first_name="Test",
        last_name="Patient",
        role=UserRole.PATIENT,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    patient = Patient(user_id=user.id, doctor_id=doctor.id)
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


def create_request(headers, doctor, patient, scheduled_at):
    return client.post(
        "/api/v1/appointments",
        json={
            "patient_id": patient.id,
            "doctor_id": doctor.id,
            "scheduled_at": scheduled_at,
            "duration_minutes": 30,
            "reason": "Consultation TZ",
        },
        headers=headers,
    )


def test_naive_scheduled_at_interpreted_as_africa_tunis(db):
    """10:00 saisi (naïf) → stocké 09:00 UTC → ré-affiché 10:00 Africa/Tunis."""
    doctor = _make_doctor(db, "dr.tz.naive@test.com")
    patient = _make_patient(db, doctor, "pat.tz.naive@test.com")
    headers = _auth_headers(patient.user)

    resp = create_request(headers, doctor, patient, "2030-06-10T10:00:00")
    assert resp.status_code == 201, resp.text
    body = resp.json()

    # 10:00 Africa/Tunis (UTC+1) == 09:00 UTC
    assert body["scheduled_at"].startswith("2030-06-10T09:00"), body["scheduled_at"]

    apt = db.query(Appointment).filter(Appointment.id == body["id"]).first()
    assert apt is not None
    # Aller-retour métier : l'heure murale tunisienne reste 10:00 (pas 12:00).
    assert to_business_naive(apt.scheduled_at) == datetime(2030, 6, 10, 10, 0)


def test_explicit_offset_gives_same_instant_as_business_wall_time(db):
    """10:00 naïf et 10:00+01:00 produisent exactement le même instant."""
    doctor = _make_doctor(db, "dr.tz.offset@test.com")
    patient = _make_patient(db, doctor, "pat.tz.offset@test.com")
    headers = _auth_headers(patient.user)

    naive = create_request(headers, doctor, patient, "2030-06-10T10:00:00")
    explicit = client.post(
        "/api/v1/appointments",
        json={
            "patient_id": patient.id,
            "doctor_id": doctor.id,
            # Jour différent pour éviter un conflit à la création.
            "scheduled_at": "2030-06-11T10:00:00+01:00",
            "duration_minutes": 30,
        },
        headers=headers,
    )
    assert naive.status_code == 201, naive.text
    assert explicit.status_code == 201, explicit.text

    apt_naive = db.query(Appointment).filter(Appointment.id == naive.json()["id"]).first()
    apt_explicit = db.query(Appointment).filter(Appointment.id == explicit.json()["id"]).first()

    # Les deux représentations donnent la même heure murale métier...
    assert to_business_naive(apt_naive.scheduled_at) == datetime(2030, 6, 10, 10, 0)
    assert to_business_naive(apt_explicit.scheduled_at) == datetime(2030, 6, 11, 10, 0)
    # ...et le même instant UTC de stockage : 10:00 Tunis = 09:00Z.
    assert apt_naive.scheduled_at.hour == apt_explicit.scheduled_at.hour == 9


def test_same_instant_different_representations_conflict(db):
    """10:00 naïf puis 10:00+01:00 (= même instant 09:00Z) → conflit 400."""
    doctor = _make_doctor(db, "dr.tz.conflict@test.com")
    patient = _make_patient(db, doctor, "pat.tz.conflict@test.com")
    headers = _auth_headers(patient.user)

    first = create_request(headers, doctor, patient, "2030-06-10T10:00:00")
    assert first.status_code == 201, first.text

    second = client.post(
        "/api/v1/appointments",
        json={
            "patient_id": patient.id,
            "doctor_id": doctor.id,
            # "10:00:00+01:00" == "09:00Z" == le créneau du 1er rendez-vous.
            "scheduled_at": "2030-06-10T10:00:00+01:00",
            "duration_minutes": 30,
        },
        headers=headers,
    )
    assert second.status_code == 400, second.text
    assert "not available" in second.json()["detail"]


def test_business_tz_and_status_enum_unchanged(db):
    """Garde-fous : fuseau métier et statuts inchangés par les corrections."""
    assert BUSINESS_TZ.key == "Africa/Tunis"
    assert AppointmentStatus.PENDING.value == "pending"
    assert AppointmentStatus.CONFIRMED.value == "confirmed"