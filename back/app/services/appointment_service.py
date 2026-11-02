"""Appointment business logic."""

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session, joinedload

from app.core.business_tz import normalize_to_utc
from app.core.constants import AppointmentStatus, NotificationType, UserRole
from app.core.exceptions import BadRequestException, ConflictException, ForbiddenException, NotFoundException
from app.core.permissions import ensure_user_can_access_patient, get_doctor_id_for_user
from app.models.appointment import Appointment
from app.models.patient import Patient
from app.models.secretary import Secretary
from app.models.user import User
from app.schemas.appointment import AppointmentCreate, AppointmentUpdate
from app.schemas.calendar import AppointmentDecision
from app.schemas.notification import NotificationCreate
from app.services import notification_store
from app.services.availability_service import check_slot_available
from app.services.calendar_service import trigger_calendar_sync
from app.services.event_service import emit_appointment_event


def check_availability(
    db: Session,
    doctor_id: int,
    scheduled_at: datetime,
    duration_minutes: int,
    exclude_appointment_id: int | None = None,
) -> bool:
    """Renvoie True si le créneau du médecin est libre (conflits + blocages).

    Délègue volontairement à availability_service.check_slot_available afin que
    la logique de conflit soit partagée : rendez-vous qui se chevauchent,
    créneaux bloqués et fenêtres de disponibilité du médecin.
    """
    end_time = scheduled_at + timedelta(minutes=duration_minutes)
    return check_slot_available(
        db,
        doctor_id,
        scheduled_at,
        end_time,
        exclude_appointment_id=exclude_appointment_id,
    )


async def create_appointment(db: Session, data: AppointmentCreate, current_user: User) -> Appointment:
    """Create appointment with availability and scope checks."""
    if current_user.role not in (UserRole.ADMIN, UserRole.DOCTOR, UserRole.SECRETARY, UserRole.PATIENT):
        raise ForbiddenException()

    patient = db.query(Patient).filter(Patient.id == data.patient_id).first()
    if not patient:
        raise NotFoundException("Patient not found")
    if patient.doctor_id != data.doctor_id:
        raise BadRequestException("Patient does not belong to this doctor")

    if current_user.role == UserRole.PATIENT and patient.user_id != current_user.id:
        raise ForbiddenException()
    if current_user.role in (UserRole.DOCTOR, UserRole.SECRETARY):
        doctor_id = get_doctor_id_for_user(db, current_user)
        if doctor_id != data.doctor_id:
            raise ForbiddenException()

    # Heure métier Africa/Tunis (naïve ou avec offset) → instant UTC exact.
    scheduled_at_utc = normalize_to_utc(data.scheduled_at)
    if not check_availability(db, data.doctor_id, scheduled_at_utc, data.duration_minutes):
        raise BadRequestException("Doctor is not available at this time")

    appointment = Appointment(
        patient_id=data.patient_id,
        doctor_id=data.doctor_id,
        scheduled_at=scheduled_at_utc,
        duration_minutes=data.duration_minutes,
        reason=data.reason,
        notes=data.notes,
        status=AppointmentStatus.PENDING,
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)

    await trigger_calendar_sync("create", appointment, patient)
    await emit_appointment_event("appointment.requested", appointment, patient)
    return appointment


def get_appointment(db: Session, appointment_id: int, current_user: User) -> Appointment:
    """Get single appointment with permission check."""
    appointment = (
        db.query(Appointment)
        .options(joinedload(Appointment.patient).joinedload(Patient.user))
        .filter(Appointment.id == appointment_id)
        .first()
    )
    if not appointment:
        raise NotFoundException("Appointment not found")

    if current_user.role == UserRole.ADMIN:
        return appointment
    if current_user.role == UserRole.PATIENT:
        if appointment.patient.user_id != current_user.id:
            raise ForbiddenException()
        return appointment

    doctor_id = get_doctor_id_for_user(db, current_user)
    if doctor_id != appointment.doctor_id:
        raise ForbiddenException()
    return appointment


def get_appointments_by_doctor(db: Session, doctor_id: int, current_user: User) -> list[Appointment]:
    """List appointments for a doctor."""
    if current_user.role == UserRole.DOCTOR:
        own = get_doctor_id_for_user(db, current_user)
        if own != doctor_id:
            raise ForbiddenException()
    elif current_user.role == UserRole.SECRETARY:
        own = get_doctor_id_for_user(db, current_user)
        if own != doctor_id:
            raise ForbiddenException()
    elif current_user.role != UserRole.ADMIN:
        raise ForbiddenException()

    return (
        db.query(Appointment)
        .options(joinedload(Appointment.patient).joinedload(Patient.user))
        .filter(Appointment.doctor_id == doctor_id)
        .order_by(Appointment.scheduled_at.desc())
        .all()
    )


def get_appointments_by_patient(db: Session, patient_id: int, current_user: User) -> list[Appointment]:
    """List appointments for a patient."""
    ensure_user_can_access_patient(db, current_user, patient_id)
    return (
        db.query(Appointment)
        .filter(Appointment.patient_id == patient_id)
        .order_by(Appointment.scheduled_at.desc())
        .all()
    )


def get_upcoming_appointments_for_user(db: Session, current_user: User) -> list[Appointment]:
    """Return future appointments accessible to the current user.

    Role scoping:
      - ADMIN: all future appointments
      - DOCTOR / SECRETARY: appointments of their own doctor_id
      - PATIENT: appointments of their own patient profile
    """
    now = datetime.now(timezone.utc)
    query = (
        db.query(Appointment)
        .options(joinedload(Appointment.patient).joinedload(Patient.user))
        .filter(Appointment.scheduled_at > now)
        .order_by(Appointment.scheduled_at.asc())
    )

    if current_user.role == UserRole.ADMIN:
        return query.all()

    if current_user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient:
            return []
        return query.filter(Appointment.patient_id == patient.id).all()

    if current_user.role in (UserRole.DOCTOR, UserRole.SECRETARY):
        doctor_id = get_doctor_id_for_user(db, current_user)
        if not doctor_id:
            return []
        return query.filter(Appointment.doctor_id == doctor_id).all()

    return []


async def update_appointment(
    db: Session,
    appointment_id: int,
    data: AppointmentUpdate,
    current_user: User,
) -> Appointment:
    """Update appointment with availability re-check."""
    appointment = get_appointment(db, appointment_id, current_user)
    update_data = data.model_dump(exclude_unset=True)
    if "scheduled_at" in update_data:
        update_data["scheduled_at"] = normalize_to_utc(update_data["scheduled_at"])

    new_scheduled_at = update_data.get("scheduled_at", appointment.scheduled_at)
    new_duration = update_data.get("duration_minutes", appointment.duration_minutes)

    if "scheduled_at" in update_data or "duration_minutes" in update_data:
        if not check_availability(
            db,
            appointment.doctor_id,
            new_scheduled_at,
            new_duration,
            exclude_appointment_id=appointment.id,
        ):
            raise BadRequestException("Doctor is not available at this time")

    old_status = appointment.status
    for field, value in update_data.items():
        setattr(appointment, field, value)

    # Règle centrale (P2) : toute transition vers CONFIRMED, y compris via le
    # PATCH générique, revalide le créneau avant commit.
    if (
        update_data.get("status") == AppointmentStatus.CONFIRMED
        and old_status != AppointmentStatus.CONFIRMED
    ):
        _transition_to_confirmed(db, appointment, original_status=old_status)

    db.commit()
    db.refresh(appointment)

    patient = _get_patient(db, appointment)

    # Annulation (patient OU staff) → événement n8n « appointment.cancelled » :
    # les workflows de rappels excluent déjà ce statut du périmètre J-7/J-1.
    new_status = update_data.get("status")
    if (
        new_status == AppointmentStatus.CANCELLED
        and old_status != AppointmentStatus.CANCELLED
    ):
        await emit_appointment_event("appointment.cancelled", appointment, patient)
        if current_user.role != UserRole.PATIENT:
            _notify_patient(
                db,
                appointment,
                current_user,
                NotificationType.SYSTEM,
                "Rendez-vous annulé",
                "Votre rendez-vous a été annulé par le cabinet médical.",
                reminder_type="cancelled",
            )

    if patient:
        await trigger_calendar_sync("update", appointment, patient)
    return appointment


async def confirm_appointment(
    db: Session,
    appointment_id: int,
    current_user: User,
) -> Appointment:
    """Patient confirms a pending appointment (avec re-vérification des conflits)."""
    if current_user.role != UserRole.PATIENT:
        raise ForbiddenException("Only patients can confirm appointments")

    appointment = get_appointment(db, appointment_id, current_user)
    if appointment.status != AppointmentStatus.PENDING:
        raise BadRequestException("Only pending appointments can be confirmed")

    # Règle centrale : re-validation systématique des conflits avant validation.
    _transition_to_confirmed(db, appointment)

    appointment.status = AppointmentStatus.CONFIRMED
    appointment.proposed_at = None
    db.commit()
    db.refresh(appointment)

    # Le patient vient d'accepter la proposition du secrétariat :
    # même chaîne que l'acceptation staff — événement n8n « appointment.confirmed »,
    # synchronisation calendrier et notification patient in-app idempotente.
    patient = _get_patient(db, appointment)
    await emit_appointment_event("appointment.confirmed", appointment, patient)
    await trigger_calendar_sync("update", appointment, patient)
    _notify_patient(
        db,
        appointment,
        current_user,
        NotificationType.APPOINTMENT_CONFIRMED,
        "Rendez-vous confirmé",
        "Votre proposition de créneau a bien été acceptée : votre rendez-vous est confirmé. À bientôt.",
        reminder_type="accepted",
    )
    return appointment


# ── Workflow secrétaire / médecin ──────────────────────────────────────────────
def _ensure_still_available(db: Session, appointment: Appointment) -> bool:
    """Re-validation du créneau lors d'une CONFIRMATION.

    Seuls les rendez-vous déjà CONFIRMÉS bloquent (une demande PENDING concurrente
    n'occupe pas encore le créneau), plus les blocages et fenêtres de
    disponibilité — voir ``_transition_to_confirmed``.
    """
    end_time = appointment.scheduled_at + timedelta(minutes=appointment.duration_minutes)
    return check_slot_available(
        db,
        appointment.doctor_id,
        appointment.scheduled_at,
        end_time,
        exclude_appointment_id=appointment.id,
        statuses=(AppointmentStatus.CONFIRMED,),
    )


def _transition_to_confirmed(
    db: Session,
    appointment: Appointment,
    original_status: AppointmentStatus | None = None,
) -> None:
    """Règle centrale de confirmation — AUCUN endpoint ne peut la contourner.

    Toute transition vers ``CONFIRMED`` (POST /accept, POST /confirm du patient,
    ou PATCH générique {status: "confirmed"}) repasse systématiquement par :
      - la vérification du statut d'ORIGINE (seules les demandes PENDING sont
        confirmables) ;
      - la revalidation complète du créneau : chevauchements de rendez-vous
        confirmés, créneaux bloqués et fenêtres de disponibilité du médecin.

    ``original_status`` permet d'appeler cette règle APRÈS application des
    champs en base d'un PATCH (le statut de l'objet est déjà CONFIRMED) tout
    en validant la transition depuis son statut d'origine.

    Lève une ``BadRequestException`` (400) si le statut est invalide et une
    ``ConflictException`` (409) si le créneau n'est plus disponible.
    """
    status_before = original_status if original_status is not None else appointment.status
    if status_before != AppointmentStatus.PENDING:
        raise BadRequestException("Seules les demandes en attente peuvent être confirmées.")
    if not _ensure_still_available(db, appointment):
        raise ConflictException(
            "Le créneau n'est plus disponible (conflit de rendez-vous ou créneau bloqué). "
            "Proposez un autre créneau au patient."
        )


def _get_patient(db: Session, appointment: Appointment) -> Patient | None:
    return db.query(Patient).filter(Patient.id == appointment.patient_id).first()


def _notify_patient(
    db: Session,
    appointment: Appointment,
    current_user: User,
    notification_type: NotificationType,
    title: str,
    message: str,
    reminder_type: str | None = None,
) -> None:
    """Crée la notification patient in-app (idempotente grâce à la clé anti-doublon).

    ``reminder_type`` alimente la clé d'idempotence
    ``appointment:{patient_id}:{appointment_id}:{reminder_type}`` : une même
    transition rejouée ne crée jamais de doublon.
    """
    try:
        notification_store.create_notification(
            db,
            NotificationCreate(
                patient_id=appointment.patient_id,
                title=title,
                message=message,
                type=notification_type.value,
                related_entity_id=appointment.id,
                related_entity_type="appointment",
                reminder_type=reminder_type,
            ),
            current_user,
        )
    except Exception as exc:  # noqa: BLE001 — ne jamais casser la transition de statut
        # rollback impératif : sans lui la session reste en état « transaction
        # échouée » (PendingRollbackError) et la sérialisation de la réponse
        # échoue à son tour alors que le changement de statut EST déjà commité.
        db.rollback()
        logging.getLogger(__name__).warning(
            "Impossible de notifier le patient pour le RDV %s : %s", appointment.id, exc
        )


def require_staff_on_appointment(db: Session, appointment_id: int, current_user: User) -> Appointment:
    """Seul le médecin concerné, sa secrétaire ou l'admin peut décider."""
    if current_user.role not in (UserRole.ADMIN, UserRole.DOCTOR, UserRole.SECRETARY):
        raise ForbiddenException("Seuls le médecin, la secrétaire ou l'admin peuvent décider.")
    return get_appointment(db, appointment_id, current_user)


async def accept_appointment(db: Session, appointment_id: int, current_user: User) -> Appointment:
    """Acceptation d'une demande : PENDING → CONFIRMED.

    La validation refait systématiquement la vérification de conflits : si le
    créneau est devenu indisponible (double réservation, blocage), la demande
    reste PENDING et une erreur 409 est renvoyée pour proposer un autre créneau.
    """
    appointment = require_staff_on_appointment(db, appointment_id, current_user)
    # Règle centrale : statut PENDING requis + revalidation complète du créneau.
    _transition_to_confirmed(db, appointment)

    appointment.status = AppointmentStatus.CONFIRMED
    appointment.proposed_at = None
    db.commit()
    db.refresh(appointment)

    patient = _get_patient(db, appointment)
    await emit_appointment_event("appointment.confirmed", appointment, patient)
    await trigger_calendar_sync("update", appointment, patient)
    _notify_patient(
        db,
        appointment,
        current_user,
        NotificationType.APPOINTMENT_CONFIRMED,
        "Rendez-vous confirmé",
        "Votre demande de rendez-vous a été confirmée. À bientôt.",
        reminder_type="accepted",
    )
    return appointment


async def reject_appointment(
    db: Session,
    appointment_id: int,
    current_user: User,
    data: AppointmentDecision | None = None,
) -> Appointment:
    """Refus d'une demande : PENDING → REJECTED."""
    appointment = require_staff_on_appointment(db, appointment_id, current_user)
    if appointment.status != AppointmentStatus.PENDING:
        raise BadRequestException("Seules les demandes en attente peuvent être refusées.")

    appointment.status = AppointmentStatus.REJECTED
    appointment.proposed_at = None
    if data and data.reason:
        appointment.notes = data.reason
    db.commit()
    db.refresh(appointment)

    patient = _get_patient(db, appointment)
    await emit_appointment_event("appointment.rejected", appointment, patient)
    message = "Votre demande de rendez-vous a été refusée."
    if data and data.reason:
        message += f" Motif : {data.reason}"
    _notify_patient(
        db,
        appointment,
        current_user,
        NotificationType.APPOINTMENT_REJECTED,
        "Rendez-vous refusé",
        message,
        reminder_type="rejected",
    )
    return appointment


async def reschedule_appointment(
    db: Session,
    appointment_id: int,
    current_user: User,
    data: AppointmentDecision,
) -> Appointment:
    """Proposer un autre créneau (la demande reste PENDING avec ``proposed_at``)."""
    appointment = require_staff_on_appointment(db, appointment_id, current_user)
    if appointment.status != AppointmentStatus.PENDING:
        raise BadRequestException("Seules les demandes en attente peuvent être recalandées.")
    if not data.proposed_at:
        raise BadRequestException("Un créneau alternatif (proposed_at) est requis.")

    # Heure murale métier (Africa/Tunis) → instant UTC explicite.
    proposed_start = normalize_to_utc(data.proposed_at)
    proposed_end = proposed_start + timedelta(minutes=appointment.duration_minutes)
    if not check_slot_available(
        db,
        appointment.doctor_id,
        proposed_start,
        proposed_end,
        exclude_appointment_id=appointment.id,
    ):
        raise ConflictException("Le créneau proposé n'est pas disponible.")

    appointment.proposed_at = proposed_start
    if data.reason:
        appointment.notes = data.reason
    db.commit()
    db.refresh(appointment)

    patient = _get_patient(db, appointment)
    await emit_appointment_event("appointment.rescheduled", appointment, patient)
    _notify_patient(
        db,
        appointment,
        current_user,
        NotificationType.APPOINTMENT_RESCHEDULED,
        "Proposition d'un autre créneau",
        "Le secrétariat vous a proposé un autre créneau. Merci de le confirmer.",
        reminder_type="rescheduled",
    )
    return appointment


# Bitmask reminder_sent : bit 1 = J-7, bit 2 = J-1 (indépendants)
REMINDER_BIT_J7 = 1
REMINDER_BIT_J1 = 2


def get_upcoming_appointments(
    db: Session,
    days_ahead: int,
    reminder_bit: int,
) -> list[Appointment]:
    """Return appointments needing reminders for the given bit flag."""
    now = datetime.now(timezone.utc)
    window_start = now + timedelta(days=days_ahead - 1)
    window_end = now + timedelta(days=days_ahead + 1)

    return (
        db.query(Appointment)
        .options(joinedload(Appointment.patient).joinedload(Patient.user))
        .filter(
            Appointment.scheduled_at >= window_start,
            Appointment.scheduled_at <= window_end,
            Appointment.status.in_([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]),
            (Appointment.reminder_sent.op("&")(reminder_bit)) == 0,
        )
        .all()
    )
