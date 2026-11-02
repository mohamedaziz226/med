"""Appointment API routes."""

from fastapi import APIRouter, Query

from sqlalchemy.orm import joinedload

from app.api.deps import CurrentUser, DbSession
from app.api.websocket import notifications as ws_notifications
from app.core.constants import UserRole
from app.models.secretary import Secretary
from app.schemas.appointment import AppointmentCreate, AppointmentResponse, AppointmentUpdate
from app.schemas.calendar import AppointmentDecision
from app.services import appointment_service

router = APIRouter(prefix="/appointments", tags=["appointments"])


@router.post("", response_model=AppointmentResponse, status_code=201)
async def create_appointment(
    data: AppointmentCreate,
    db: DbSession,
    current_user: CurrentUser,
) -> AppointmentResponse:
    appointment = await appointment_service.create_appointment(db, data, current_user)
    await _notify_staff(
        db,
        appointment.doctor_id,
        {
            "type": "appointment_requested",
            "appointment_id": appointment.id,
            "message": "Une nouvelle demande de rendez-vous est en attente",
        },
    )
    return AppointmentResponse.model_validate(appointment)


@router.get("/upcoming", response_model=list[AppointmentResponse])
def list_upcoming_appointments(db: DbSession, current_user: CurrentUser) -> list[AppointmentResponse]:
    """Return all upcoming (future) appointments accessible to the current user."""
    appointments = appointment_service.get_upcoming_appointments_for_user(db, current_user)
    return [AppointmentResponse.model_validate(a) for a in appointments]


@router.get("/{appointment_id}", response_model=AppointmentResponse)
def get_appointment(appointment_id: int, db: DbSession, current_user: CurrentUser) -> AppointmentResponse:
    appointment = appointment_service.get_appointment(db, appointment_id, current_user)
    return AppointmentResponse.model_validate(appointment)


@router.get("", response_model=list[AppointmentResponse])
def list_appointments(
    db: DbSession,
    current_user: CurrentUser,
    doctor_id: int | None = Query(None),
    patient_id: int | None = Query(None),
) -> list[AppointmentResponse]:
    if patient_id:
        appointments = appointment_service.get_appointments_by_patient(db, patient_id, current_user)
    elif doctor_id:
        appointments = appointment_service.get_appointments_by_doctor(db, doctor_id, current_user)
    else:
        from app.core.exceptions import BadRequestException

        raise BadRequestException("Provide doctor_id or patient_id")
    return [AppointmentResponse.model_validate(a) for a in appointments]


@router.patch("/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(
    appointment_id: int,
    data: AppointmentUpdate,
    db: DbSession,
    current_user: CurrentUser,
) -> AppointmentResponse:
    appointment = await appointment_service.update_appointment(db, appointment_id, data, current_user)
    return AppointmentResponse.model_validate(appointment)


@router.post("/{appointment_id}/confirm", response_model=AppointmentResponse)
async def confirm_appointment(
    appointment_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> AppointmentResponse:
    appointment = await appointment_service.confirm_appointment(db, appointment_id, current_user)

    secretaries = (
        db.query(Secretary)
        .filter(Secretary.doctor_id == appointment.doctor_id)
        .all()
    )
    for secretary in secretaries:
        await ws_notifications.send_notification(
            secretary.user_id,
            {
                "type": "appointment_confirmed",
                "appointment_id": appointment.id,
                "message": "Un patient a confirmé son rendez-vous",
            },
        )

    return AppointmentResponse.model_validate(appointment)


async def _notify_staff(db: DbSession, doctor_id: int, message: dict) -> None:
    """Notification temps réel (WebSocket) au médecin et à ses secrétaires."""
    secretaries = (
        db.query(Secretary)
        .filter(Secretary.doctor_id == doctor_id)
        .options(joinedload(Secretary.doctor))
        .all()
    )
    targets = [secretary.user_id for secretary in secretaries]
    targets.append(secretaries[0].doctor.user_id if secretaries and secretaries[0].doctor else None)
    for user_id in {target for target in targets if target}:
        await ws_notifications.send_notification(user_id, message)


@router.post("/{appointment_id}/accept", response_model=AppointmentResponse)
async def accept_appointment(
    appointment_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> AppointmentResponse:
    """Le médecin ou la secrétaire accepte une demande : PENDING → CONFIRMED."""
    appointment = await appointment_service.accept_appointment(db, appointment_id, current_user)
    return AppointmentResponse.model_validate(appointment)


@router.post("/{appointment_id}/reject", response_model=AppointmentResponse)
async def reject_appointment(
    appointment_id: int,
    data: AppointmentDecision,
    db: DbSession,
    current_user: CurrentUser,
) -> AppointmentResponse:
    """Refuse une demande : PENDING → REJECTED (motif optionnel)."""
    appointment = await appointment_service.reject_appointment(
        db, appointment_id, current_user, data
    )
    return AppointmentResponse.model_validate(appointment)


@router.post("/{appointment_id}/reschedule", response_model=AppointmentResponse)
async def reschedule_appointment(
    appointment_id: int,
    data: AppointmentDecision,
    db: DbSession,
    current_user: CurrentUser,
) -> AppointmentResponse:
    """Propose un autre créneau : la demande reste PENDING (proposed_at renseigné)."""
    appointment = await appointment_service.reschedule_appointment(
        db, appointment_id, current_user, data
    )
    return AppointmentResponse.model_validate(appointment)
