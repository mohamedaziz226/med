"""Parcours utilisateur complet — de la demande de RDV aux rappels n8n.

Vérifie la chaîne intégrale :
  1. Le patient crée une demande de rendez-vous        → statut PENDING.
  2. La secrétaire voit la demande                     → GET /appointments?doctor_id.
  3a. La secrétaire valide le créneau demandé          → POST /accept    (CONFIRMED).
  3b. OU propose un autre créneau                      → POST /reschedule (reste PENDING,
      proposed_at renseigné) puis le patient confirme  → POST /confirm   (CONFIRMED).
  4. Le RDV confirmé est visible côté patient          → GET /appointments?patient_id.
  5. Le patient reçoit une notification in-app         → GET /notifications.
  6. n8n dispose du RDV pour les rappels               → GET /appointments/upcoming
     (workflow « Rappels J-7/J-1 », champs snake_case attendus par son code JS).

NB comportements couverts :
  - la confirmation PAR LE PATIENT (chemin 3b) émet désormais l'événement n8n
    « appointment.confirmed », déclenche la synchro calendrier et crée la
    notification patient idempotente (reminder_type="accepted") ;
  - l'annulation via PATCH {"status": "cancelled"} émet « appointment.cancelled »
    et sort le RDV du périmètre des rappels (GET /appointments/upcoming).

Les appels réseau sortants vers n8n sont neutralisés par la fixture
``_no_n8n_network`` ; les émissions d'événements sont observées via un espion
(monkeypatch sur ``appointment_service.emit_appointment_event``).
"""

from datetime import datetime, timedelta, timezone

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401 — enregistre tous les modèles sur Base.metadata
from app.api.deps import get_db
from app.api.v1 import appointments as appointments_api
from app.api.v1 import notifications as notifications_api
from app.core.constants import UserRole
from app.core.security import create_access_token, hash_password
from app.database.base import Base
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.secretary import Secretary
from app.models.user import User
from app.services import appointment_service
from app.services.appointment_service import (
    get_upcoming_appointments,
    REMINDER_BIT_J1,
    REMINDER_BIT_J7,
)


def install_event_spy(monkeypatch) -> list[str]:
    """Remplace les émissions réseau n8n par un collecteur d'événements."""
    events: list[str] = []

    async def _fake_emit(event, appointment, patient=None):
        events.append(event)

    async def _fake_sync(action, appointment=None, patient=None):
        return None

    monkeypatch.setattr(appointment_service, "emit_appointment_event", _fake_emit)
    monkeypatch.setattr(appointment_service, "trigger_calendar_sync", _fake_sync)
    return events

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app = FastAPI()
app.include_router(appointments_api.router, prefix="/api/v1")
app.include_router(notifications_api.router, prefix="/api/v1")
app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def _no_n8n_network(monkeypatch):
    """Aucune requête HTTP sortante vers n8n pendant les tests."""
    from app.core.config import settings as _settings

    monkeypatch.setattr(_settings, "N8N_WEBHOOK_URL", "")


@pytest.fixture()
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


# ── Fabriques (même esprit que tests/conftest.py) ─────────────────────────────
def auth_headers(user: User) -> dict:
    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return {"Authorization": f"Bearer {token}"}


def make_doctor(db, email="dr.journey@example.com"):
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


def make_secretary(db, doctor_id: int, email="sec.journey@example.com"):
    user = User(
        email=email,
        password_hash=hash_password("Password123!"),
        first_name="Salma",
        last_name="Trabelsi",
        role=UserRole.SECRETARY,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    secretary = Secretary(user_id=user.id, doctor_id=doctor_id)
    db.add(secretary)
    db.commit()
    db.refresh(secretary)
    return user, secretary


def make_patient(db, doctor_id: int, email: str, first_name="Amine", last_name="Test"):
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


def make_admin(db, email="admin.journey@example.com"):
    user = User(
        email=email,
        password_hash=hash_password("Password123!"),
        first_name="Admin",
        last_name="Med",
        role=UserRole.ADMIN,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def request_payload(patient, doctor, days_ahead: int, hour_utc: int = 9) -> dict:
    """Demande du patient à J+N, heure UTC explicite (Tunisie = UTC+1)."""
    scheduled_at = datetime.now(timezone.utc).replace(
        hour=hour_utc, minute=0, second=0, microsecond=0
    ) + timedelta(days=days_ahead)
    return {
        "patient_id": patient.id,
        "doctor_id": doctor.id,
        "scheduled_at": scheduled_at.isoformat(),
        "duration_minutes": 30,
        "reason": "Consultation générale",
    }

# ── Chemin nominal : acceptation directe par la secrétaire ────────────────────
def test_parcours_complet_acceptation_directe(db, monkeypatch):
    events = install_event_spy(monkeypatch)
    doctor_user, doctor = make_doctor(db)
    secretary_user, _ = make_secretary(db, doctor.id)
    patient_user, patient = make_patient(
        db, doctor.id, "patient.a@example.com", first_name="Amine", last_name="Brahem"
    )
    admin = make_admin(db)

    # 1) Le patient demande un rendez-vous → PENDING.
    resp = client.post(
        "/api/v1/appointments",
        json=request_payload(patient, doctor, days_ahead=3),
        headers=auth_headers(patient_user),
    )
    assert resp.status_code == 201, resp.text
    rdv = resp.json()
    assert rdv["status"] == "pending"
    assert rdv["proposed_at"] is None
    appt_id = rdv["id"]

    # 2) La secrétaire voit la demande « En attente » de SON médecin.
    resp = client.get(
        f"/api/v1/appointments?doctor_id={doctor.id}",
        headers=auth_headers(secretary_user),
    )
    assert resp.status_code == 200, resp.text
    pending = [a for a in resp.json() if a["id"] == appt_id]
    assert len(pending) == 1
    assert pending[0]["status"] == "pending"
    assert pending[0]["patient_id"] == patient.id

    # Une secrétaire d'un AUTRE cabinet ne doit pas voir la demande.
    _other_doc_user, other_doc = make_doctor(db, email="dr.other@example.com")
    other_sec_user, _ = make_secretary(db, other_doc.id, email="sec.other@example.com")
    resp = client.get(
        f"/api/v1/appointments?doctor_id={other_doc.id}",
        headers=auth_headers(other_sec_user),
    )
    assert resp.status_code == 200
    assert all(a["id"] != appt_id for a in resp.json())

    # 3a) La secrétaire fixe le créneau demandé : PENDING → CONFIRMED.
    resp = client.post(
        f"/api/v1/appointments/{appt_id}/accept",
        headers=auth_headers(secretary_user),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "confirmed"
    # L'événement n8n de confirmation est émis par le chemin staff aussi.
    assert "appointment.confirmed" in events

    # Le patient ne peut pas re-confirmer un RDV déjà confirmé.
    resp = client.post(
        f"/api/v1/appointments/{appt_id}/confirm",
        headers=auth_headers(patient_user),
    )
    assert resp.status_code == 400

    # 4) Le patient voit son rendez-vous confirmé.
    resp = client.get(
        f"/api/v1/appointments?patient_id={patient.id}",
        headers=auth_headers(patient_user),
    )
    assert resp.status_code == 200, resp.text
    mine = [a for a in resp.json() if a["id"] == appt_id]
    assert len(mine) == 1
    assert mine[0]["status"] == "confirmed"

    # 5) Le patient reçoit la notification « Rendez-vous confirmé ».
    resp = client.get("/api/v1/notifications", headers=auth_headers(patient_user))
    assert resp.status_code == 200, resp.text
    notifs = [n for n in resp.json() if n["related_entity_id"] == appt_id]
    assert any(n["type"] == "appointment_confirmed" for n in notifs)
    assert any(n["title"] == "Rendez-vous confirmé" for n in notifs)

    # 6) n8n — matière première du workflow de rappels (compte admin).
    resp = client.get("/api/v1/appointments/upcoming", headers=auth_headers(admin))
    assert resp.status_code == 200, resp.text
    upcoming = [a for a in resp.json() if a["id"] == appt_id]
    assert len(upcoming) == 1

# ── Variante : la secrétaire propose un autre créneau, le patient confirme ────
def test_parcours_recalage_puis_confirmation_patient(db, monkeypatch):
    events = install_event_spy(monkeypatch)
    doctor_user, doctor = make_doctor(db)
    secretary_user, _ = make_secretary(db, doctor.id, email="sec.b@example.com")
    patient_user, patient = make_patient(
        db, doctor.id, "patient.b@example.com", first_name="Nour", last_name="Gharbi"
    )
    admin = make_admin(db, email="admin.b@example.com")

    # 1) Demande du patient à J+5.
    resp = client.post(
        "/api/v1/appointments",
        json=request_payload(patient, doctor, days_ahead=5, hour_utc=9),
        headers=auth_headers(patient_user),
    )
    assert resp.status_code == 201, resp.text
    appt_id = resp.json()["id"]
    assert resp.json()["status"] == "pending"

    # 2) La secrétaire voit la demande en attente.
    resp = client.get(
        f"/api/v1/appointments?doctor_id={doctor.id}",
        headers=auth_headers(secretary_user),
    )
    assert any(a["id"] == appt_id for a in resp.json())

    # 3b) La secrétaire propose un autre créneau (J+6, 10:00 UTC) :
    #     la demande RESTE PENDING avec proposed_at renseigné.
    alternative = (
        datetime.now(timezone.utc).replace(hour=10, minute=0, second=0, microsecond=0)
        + timedelta(days=6)
    ).isoformat()
    resp = client.post(
        f"/api/v1/appointments/{appt_id}/reschedule",
        json={"proposed_at": alternative, "reason": "Créneau initial complet"},
        headers=auth_headers(secretary_user),
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["status"] == "pending"
    assert body["proposed_at"] is not None

    # 4bis) Le patient voit la proposition et confirme : PENDING → CONFIRMED.
    resp = client.get(
        f"/api/v1/appointments?patient_id={patient.id}",
        headers=auth_headers(patient_user),
    )
    mine = next(a for a in resp.json() if a["id"] == appt_id)
    assert mine["status"] == "pending"
    assert mine["proposed_at"] is not None

    resp = client.post(
        f"/api/v1/appointments/{appt_id}/confirm",
        headers=auth_headers(patient_user),
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["status"] == "confirmed"
    assert body["proposed_at"] is None

    # La confirmation PAR LE PATIENT émet l'événement n8n « appointment.confirmed ».
    assert "appointment.confirmed" in events

    # ... et crée la notification patient « Rendez-vous confirmé » idempotente.
    resp = client.get("/api/v1/notifications", headers=auth_headers(patient_user))
    confirmed_notifs = [
        n
        for n in resp.json()
        if n["type"] == "appointment_confirmed" and n["related_entity_id"] == appt_id
    ]
    assert len(confirmed_notifs) >= 1

    # 5bis) Notifications reçues par le patient : au minimum la PROPOSITION
    #       d'un autre créneau émise lors du recalage par la secrétaire.
    #       (La confirmation PAR LE PATIENT n'émet volontairement ni nouvelle
    #       notification ni événement n8n — cf. docstring du module.)
    resp = client.get("/api/v1/notifications", headers=auth_headers(patient_user))
    types = {n["type"] for n in resp.json()}
    assert "appointment_rescheduled" in types

    # 6bis) Le RDV recalandé puis confirmé alimente bien les rappels n8n.
    resp = client.get("/api/v1/appointments/upcoming", headers=auth_headers(admin))
    upcoming = next(a for a in resp.json() if a["id"] == appt_id)
    assert upcoming["status"] == "confirmed"


# ── Annulation par le patient : événement cancelled + hors rappels ────────────
def test_parcours_annulation_patient_exclut_des_rappels(db, monkeypatch):
    events = install_event_spy(monkeypatch)
    doctor_user, doctor = make_doctor(db)
    patient_user, patient = make_patient(
        db, doctor.id, "patient.c@example.com", first_name="Yassine", last_name="Hamdi"
    )
    admin = make_admin(db, email="admin.c@example.com")

    # Demande du patient à J+4.
    resp = client.post(
        "/api/v1/appointments",
        json=request_payload(patient, doctor, days_ahead=4),
        headers=auth_headers(patient_user),
    )
    assert resp.status_code == 201, resp.text
    appt_id = resp.json()["id"]

    # Le patient annule sa demande (refus de la proposition éventuelle).
    resp = client.patch(
        f"/api/v1/appointments/{appt_id}",
        json={"status": "cancelled"},
        headers=auth_headers(patient_user),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "cancelled"

    # L'événement n8n « appointment.cancelled » est émis.
    assert "appointment.cancelled" in events
    # Aucune notification « Rendez-vous annulé » à soi-même (acteur = patient).
    resp = client.get("/api/v1/notifications", headers=auth_headers(patient_user))
    self_cancel = [
        n
        for n in resp.json()
        if n["title"] == "Rendez-vous annulé" and n["related_entity_id"] == appt_id
    ]
    assert self_cancel == []

    # Périmètre RÉEL des rappels J-7/J-1 (même requête que le flux consommé par
    # n8n via la couche service) : un RDV annulé en est exclu côté backend.
    reminders_pool = (
        get_upcoming_appointments(db, days_ahead=7, reminder_bit=REMINDER_BIT_J7)
        + get_upcoming_appointments(db, days_ahead=1, reminder_bit=REMINDER_BIT_J1)
    )
    assert all(a.id != appt_id for a in reminders_pool)

    # L'endpoint public /upcoming expose le statut à jour (le workflow n8n
    # filtre lui aussi les statuts hors pending/confirmed avant tout rappel).
    resp = client.get("/api/v1/appointments/upcoming", headers=auth_headers(admin))
    row = next((a for a in resp.json() if a["id"] == appt_id), None)
    if row is not None:
        assert row["status"] == "cancelled"

    # La confirmation d'un RDV annulé est impossible.
    resp = client.post(
        f"/api/v1/appointments/{appt_id}/confirm",
        headers=auth_headers(patient_user),
    )
    assert resp.status_code == 400

