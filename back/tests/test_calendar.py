"""Tests du calendrier partagé — disponibilités, blocages, conflits, workflow.

Couvre :
- Conflits de rendez-vous avant la création ET avant la validation (accept).
- Créneaux bloqués visibles dans les slots disponibles.
- Disponibilités (hebdo + date ponctuelle) et slots libres exposés au patient.
- Workflow secrétaire/médecin : accept (PENDING→CONFIRMED), reject
  (PENDING→REJECTED), reschedule (proposed_at).
- Isolation patient (un patient ne voit que les créneaux de SON médecin).
"""

from datetime import datetime

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.api.deps import get_db
from app.api.v1 import appointments as appointments_api
from app.api.v1 import calendar as calendar_api
from app.core.constants import AppointmentStatus, UserRole
from app.core.security import create_access_token, hash_password
from app.database.base import Base
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
app.include_router(calendar_api.router, prefix="/api/v1")
app.include_router(appointments_api.router, prefix="/api/v1")
app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


def _auth_headers(user: User) -> dict:
    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


def make_user(db, role: UserRole, email: str) -> User:
    user = User(
        email=email,
        password_hash=hash_password("Password123!"),
        first_name="Test",
        last_name="User",
        role=role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def make_doctor(db, email="dr.cal@example.com"):
    from app.models.doctor import Doctor

    user = make_user(db, UserRole.DOCTOR, email)
    doctor = Doctor(
        user_id=user.id,
        specialty="Médecine générale",
        license_number=f"LIC-{user.id}",
    )
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    return doctor


def make_secretary(db, doctor, email="sec.cal@example.com"):
    from app.models.secretary import Secretary

    user = make_user(db, UserRole.SECRETARY, email)
    secretary = Secretary(user_id=user.id, doctor_id=doctor.id)
    db.add(secretary)
    db.commit()
    db.refresh(secretary)
    return secretary


def make_patient(db, doctor, email="pat.cal@example.com"):
    from app.models.patient import Patient

    user = make_user(db, UserRole.PATIENT, email)
    patient = Patient(user_id=user.id, doctor_id=doctor.id)
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


def make_appointment(db, doctor, patient, scheduled_at, status=AppointmentStatus.PENDING):
    from app.core.business_tz import normalize_to_utc
    from app.models.appointment import Appointment

    apt = Appointment(
        patient_id=patient.id,
        doctor_id=doctor.id,
        # Même convention que l'API : heure naïve = heure métier Africa/Tunis.
        scheduled_at=normalize_to_utc(scheduled_at),
        duration_minutes=30,
        status=status,
    )
    db.add(apt)
    db.commit()
    db.refresh(apt)
    return apt


# ── Helpers API ────────────────────────────────────────────────────────────────
def create_availability(headers, doctor_id, weekday=0, start="09:00", end="12:00"):
    return client.post(
        f"/api/v1/calendar/doctors/{doctor_id}/availability",
        json={"weekday": weekday, "start_time": start, "end_time": end},
        headers=headers,
    )


def create_blocked(headers, doctor_id, start, end, reason="Formation"):
    return client.post(
        f"/api/v1/calendar/doctors/{doctor_id}/blocked-slots",
        json={"start": start, "end": end, "reason": reason},
        headers=headers,
    )


def get_slots(headers, doctor_id, start_date, end_date):
    return client.get(
        f"/api/v1/calendar/doctors/{doctor_id}/slots",
        params={"start_date": start_date, "end_date": end_date},
        headers=headers,
    )


def create_pending_request(headers, doctor, patient, scheduled_at):
    return client.post(
        "/api/v1/appointments",
        json={
            "patient_id": patient.id,
            "doctor_id": doctor.id,
            "scheduled_at": scheduled_at,
            "duration_minutes": 30,
            "reason": "Consultation",
        },
        headers=headers,
    )


# ── Tests ──────────────────────────────────────────────────────────────────────
def test_create_availability_and_list(db):
    doctor = make_doctor(db, "dr.avail@example.com")
    headers = _auth_headers(doctor.user)

    resp = create_availability(headers, doctor.id)
    assert resp.status_code == 201, resp.text
    body = resp.json()
    # Python weekday : 0 = lundi ... 6 = dimanche
    assert body["weekday"] == 0
    assert body["start_time"] == "09:00:00"

    listing = client.get(f"/api/v1/calendar/doctors/{doctor.id}/availability", headers=headers)
    assert listing.status_code == 200
    assert len(listing.json()) == 1


def test_patient_sees_only_free_slots(db):
    doctor = make_doctor(db, "dr.slots@test.com")
    patient = make_patient(db, doctor, "pat.slots@test.com")
    patient_headers = _auth_headers(patient.user)

    # 31/08/2026 est un lundi futur (weekday Python = 0).
    create_availability(_auth_headers(doctor.user), doctor.id, weekday=0, start="09:00", end="11:00")

    # Un RDV confirmé occupe 09:00-09:30 ; un créneau bloqué occupe 10:00-10:30.
    make_appointment(
        db, doctor, patient, datetime(2026, 8, 31, 9, 0), status=AppointmentStatus.CONFIRMED
    )
    create_blocked(_auth_headers(doctor.user), doctor.id, "2026-08-31T10:00:00", "2026-08-31T10:30:00")

    # 31/08/2026 est un lundi.
    resp = get_slots(patient_headers, doctor.id, "2026-08-31", "2026-08-31")
    assert resp.status_code == 200, resp.text
    times = [s["start"].split("T")[1][:5] for s in resp.json()]
    assert "09:00" not in times  # occupé par le RDV confirmé
    assert "10:00" not in times  # blocage
    assert "09:30" in times
    assert "10:30" in times


def test_creation_conflict_rejected(db):
    doctor = make_doctor(db, "dr.conflict@test.com")
    patient = make_patient(db, doctor, "pat.conflict@test.com")
    headers = _auth_headers(patient.user)

    base = datetime(2026, 1, 5, 9, 0)
    make_appointment(db, doctor, patient, base, status=AppointmentStatus.CONFIRMED)

    resp = create_pending_request(headers, doctor, patient, base.isoformat())
    assert resp.status_code == 400
    assert "not available" in resp.json()["detail"].lower()


def test_accept_fails_if_slot_now_conflicts(db):
    doctor = make_doctor(db, "dr.accept@test.com")
    secretary = make_secretary(db, doctor)
    patient = make_patient(db, doctor, "pat.accept@test.com")
    sec_headers = _auth_headers(secretary.user)

    slot = datetime(2026, 1, 5, 9, 0)
    pending = make_appointment(db, doctor, patient, slot, status=AppointmentStatus.PENDING)

    # Un second patient occupe le même créneau AVANT la validation.
    other = make_patient(db, doctor, "pat.conflict2@test.com")
    make_appointment(db, doctor, other, slot, status=AppointmentStatus.CONFIRMED)

    resp = client.post(f"/api/v1/appointments/{pending.id}/accept", headers=sec_headers)
    assert resp.status_code == 409  # conflit détecté à la validation


def test_accept_reject_flow(db):
    doctor = make_doctor(db, "dr.flow@test.com")
    secretary = make_secretary(db, doctor)
    patient = make_patient(db, doctor, "pat.flow@test.com")
    sec_headers = _auth_headers(secretary.user)

    slot = datetime(2026, 1, 5, 9, 0)
    pending = make_appointment(db, doctor, patient, slot, status=AppointmentStatus.PENDING)

    resp = client.post(f"/api/v1/appointments/{pending.id}/accept", headers=sec_headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == AppointmentStatus.CONFIRMED.value

    # Reject après acceptation → 400
    resp = client.post(
        f"/api/v1/appointments/{pending.id}/reject",
        json={"reason": "double réservation"},
        headers=sec_headers,
    )
    assert resp.status_code == 400


def test_reject_and_reschedule(db):
    doctor = make_doctor(db, "dr.rej@test.com")
    secretary = make_secretary(db, doctor)
    patient = make_patient(db, doctor, "pat.rej@test.com")
    sec_headers = _auth_headers(secretary.user)

    pending = make_appointment(db, doctor, patient, datetime(2026, 1, 5, 9, 0))

    reject = client.post(
        f"/api/v1/appointments/{pending.id}/reject",
        json={"reason": "Cabinet fermé"},
        headers=sec_headers,
    )
    assert reject.status_code == 200, reject.text
    assert reject.json()["status"] == AppointmentStatus.REJECTED.value

    # Réservation suivante → reschedule
    pending2 = make_appointment(db, doctor, patient, datetime(2026, 1, 12, 9, 0))
    resched = client.post(
        f"/api/v1/appointments/{pending2.id}/reschedule",
        json={"proposed_at": "2026-01-12T11:00:00", "reason": "Déplacement de créneau"},
        headers=sec_headers,
    )
    assert resched.status_code == 200, resched.text
    body = resched.json()
    assert body["status"] == AppointmentStatus.PENDING.value
    assert body["proposed_at"] is not None


def test_patient_cannot_access_another_doctor_slots(db):
    from app.models.doctor import Doctor

    doc_a = make_doctor(db, "dr.a@test.com")
    doc_b = Doctor(
        user_id=make_user(db, UserRole.DOCTOR, "dr.b@test.com").id,
        specialty="Cardio",
        license_number="LIC-B",
    )
    db.add(doc_b)
    db.commit()
    db.refresh(doc_b)

    patient_a = make_patient(db, doc_a, "pat.a@test.com")
    create_availability(_auth_headers(doc_a.user), doc_a.id, weekday=1)

    resp = get_slots(_auth_headers(patient_a.user), doc_b.id, "2026-01-05", "2026-01-05")
    assert resp.status_code == 403


def test_legacy_mode_without_availability_allows_creation(db):
    doctor = make_doctor(db, "dr.legacy@test.com")
    patient = make_patient(db, doctor, "pat.legacy@test.com")
    headers = _auth_headers(patient.user)

    resp = create_pending_request(headers, doctor, patient, datetime(2026, 1, 5, 9, 0).isoformat())
    assert resp.status_code == 201, resp.text


def test_blocked_slot_materialized_in_calendar(db):
    doctor = make_doctor(db, "dr.calendar@test.com")
    sec_headers = _auth_headers(doctor.user)

    create_availability(sec_headers, doctor.id, weekday=1, start="09:00", end="12:00")
    blocked = create_blocked(sec_headers, doctor.id, "2026-01-05T10:00:00", "2026-01-05T11:00:00")
    assert blocked.status_code == 201, blocked.text

    resp = client.get(
        f"/api/v1/calendar/doctors/{doctor.id}/calendar",
        params={"start_date": "2026-01-05", "end_date": "2026-01-05"},
        headers=sec_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["blocked_slots"]) == 1
    assert body["blocked_slots"][0]["reason"] == "Formation"
    assert len(body["availability"]) == 1


# ── P2 : la confirmation via PATCH générique revalide les conflits ────────────
def test_patch_cannot_confirm_overlapping_pending_requests(db):
    """Deux demandes PENDING au même créneau :
    - confirmer la première → succès ;
    - confirmer la deuxième → refus (409) ;
    - un seul rendez-vous CONFIRMED au final.
    """
    from app.models.appointment import Appointment

    doctor = make_doctor(db, "dr.dblconf@test.com")
    patient = make_patient(db, doctor, "pat.dblconf@test.com")
    headers = _auth_headers(doctor.user)

    slot = datetime(2026, 3, 2, 9, 0)  # heure métier Africa/Tunis
    first = make_appointment(db, doctor, patient, slot)
    second = make_appointment(db, doctor, patient, slot)

    ok = client.patch(
        f"/api/v1/appointments/{first.id}",
        json={"status": "confirmed"},
        headers=headers,
    )
    assert ok.status_code == 200, ok.text
    assert ok.json()["status"] == AppointmentStatus.CONFIRMED.value

    conflict = client.patch(
        f"/api/v1/appointments/{second.id}",
        json={"status": "confirmed"},
        headers=headers,
    )
    assert conflict.status_code == 409, conflict.text
    assert "plus disponible" in conflict.json()["detail"]

    confirmed = (
        db.query(Appointment)
        .filter(
            Appointment.doctor_id == doctor.id,
            Appointment.status == AppointmentStatus.CONFIRMED,
        )
        .all()
    )
    assert len(confirmed) == 1
    assert confirmed[0].id == first.id


def test_accept_endpoint_still_validates_conflicts_after_refactor(db):
    """Non-régression : POST /accept refuse toujours un créneau devenu occupé."""
    doctor = make_doctor(db, "dr.acceptdbl@test.com")
    patient = make_patient(db, doctor, "pat.acceptdbl@test.com")
    headers = _auth_headers(doctor.user)

    slot = datetime(2026, 3, 9, 9, 0)
    target = make_appointment(db, doctor, patient, slot)
    blocker = make_appointment(db, doctor, patient, slot, status=AppointmentStatus.CONFIRMED)

    resp = client.post(f"/api/v1/appointments/{target.id}/accept", headers=headers)
    assert resp.status_code == 409, resp.text

    statuses = {
        a.id: a.status
        for a in db.query(Appointment).filter(Appointment.doctor_id == doctor.id).all()
    }
    assert statuses[target.id] == AppointmentStatus.PENDING
    assert statuses[blocker.id] == AppointmentStatus.CONFIRMED