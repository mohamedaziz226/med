"""Calendar API routes — disponibilités, créneaux bloqués, agenda partagé.

Le calendrier partagé médecin/sécrétaire expose les disponibilités, les
créneaux bloqués, les rendez-vous confirmés et les demandes en attente.
Les patients ne consomment que GET /calendar/doctors/{id}/slots (créneaux
réellement libres, aucune donnée privée d'un autre patient).
"""

from datetime import date

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, DbSession
from app.core.constants import UserRole
from app.core.exceptions import ForbiddenException
from app.schemas.calendar import (
    AvailabilityCreate,
    AvailabilityResponse,
    AvailabilityUpdate,
    AvailableSlotResponse,
    BlockedSlotCreate,
    BlockedSlotResponse,
    CalendarResponse,
)
from app.services import availability_service

router = APIRouter(prefix="/calendar", tags=["calendar"])


def _scope_access(db: DbSession, current_user: CurrentUser, doctor_id: int) -> None:
    """Barre de sécurité : staff du médecin (ou admin) uniquement."""
    availability_service.ensure_can_manage_doctor(db, current_user, doctor_id)


# ── Calendrier partagé (médecin / secrétaire) ─────────────────────────────────
@router.get("/doctors/{doctor_id}/calendar", response_model=CalendarResponse)
def get_doctor_calendar(
    doctor_id: int,
    db: DbSession,
    current_user: CurrentUser,
    start_date: date = Query(..., description="Date de début (YYYY-MM-DD)"),
    end_date: date = Query(..., description="Date de fin (YYYY-MM-DD)"),
) -> CalendarResponse:
    """Vue partagée : disponibilités + blocages + RDV confirmés + demandes en attente."""
    _scope_access(db, current_user, doctor_id)
    data = availability_service.get_calendar(db, doctor_id, start_date, end_date)
    return CalendarResponse.model_validate(data)


# ── Créneaux disponibles (patient / staff) ────────────────────────────────────
@router.get("/doctors/{doctor_id}/slots", response_model=list[AvailableSlotResponse])
def get_available_slots(
    doctor_id: int,
    db: DbSession,
    current_user: CurrentUser,
    start_date: date = Query(description="Date de début (YYYY-MM-DD)"),
    end_date: date = Query(description="Date de fin (YYYY-MM-DD)"),
    duration_minutes: int = Query(30, ge=5, le=480),
) -> list[AvailableSlotResponse]:
    """Créneaux réellement libres d'un médecin (vision patient, sans données privées)."""
    if current_user.role == UserRole.PATIENT:
        # Un patient ne consulte que les créneaux de son propre médecin.
        from app.models.patient import Patient

        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient or patient.doctor_id != doctor_id:
            raise ForbiddenException("Vous ne pouvez consulter que les créneaux de votre médecin")
    else:
        _scope_access(db, current_user, doctor_id)

    slots = availability_service.get_available_slots(
        db, doctor_id, start_date, end_date, duration_minutes
    )
    return [AvailableSlotResponse.model_validate(s) for s in slots]


# ── Disponibilités ─────────────────────────────────────────────────────────────
@router.get("/doctors/{doctor_id}/availability", response_model=list[AvailabilityResponse])
def list_availability(
    doctor_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> list[AvailabilityResponse]:
    _scope_access(db, current_user, doctor_id)
    return [
        AvailabilityResponse.model_validate(a)
        for a in availability_service.list_availabilities(db, doctor_id)
    ]


@router.post("/doctors/{doctor_id}/availability", response_model=AvailabilityResponse, status_code=201)
def create_availability(
    doctor_id: int,
    data: AvailabilityCreate,
    db: DbSession,
    current_user: CurrentUser,
) -> AvailabilityResponse:
    _scope_access(db, current_user, doctor_id)
    availability = availability_service.create_availability(db, doctor_id, data, current_user)
    return AvailabilityResponse.model_validate(availability)


@router.patch("/availability/{availability_id}", response_model=AvailabilityResponse)
def update_availability(
    availability_id: int,
    data: AvailabilityUpdate,
    db: DbSession,
    current_user: CurrentUser,
) -> AvailabilityResponse:
    availability = availability_service.update_availability(db, availability_id, data, current_user)
    return AvailabilityResponse.model_validate(availability)


@router.delete("/availability/{availability_id}", status_code=204)
def delete_availability(
    availability_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> None:
    availability_service.delete_availability(db, availability_id, current_user)


# ── Créneaux bloqués ───────────────────────────────────────────────────────────
@router.get("/doctors/{doctor_id}/blocked-slots", response_model=list[BlockedSlotResponse])
def list_blocked_slots(
    doctor_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> list[BlockedSlotResponse]:
    _scope_access(db, current_user, doctor_id)
    return [
        BlockedSlotResponse.model_validate(b)
        for b in availability_service.list_blocked_slots(db, doctor_id)
    ]


@router.post("/doctors/{doctor_id}/blocked-slots", response_model=BlockedSlotResponse, status_code=201)
def create_blocked_slot(
    doctor_id: int,
    data: BlockedSlotCreate,
    db: DbSession,
    current_user: CurrentUser,
) -> BlockedSlotResponse:
    _scope_access(db, current_user, doctor_id)
    blocked = availability_service.create_blocked_slot(db, doctor_id, data, current_user)
    return BlockedSlotResponse.model_validate(blocked)


@router.delete("/blocked-slots/{blocked_id}", status_code=204)
def delete_blocked_slot(
    blocked_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> None:
    availability_service.delete_blocked_slot(db, blocked_id, current_user)