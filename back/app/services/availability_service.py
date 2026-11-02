"""Service calendrier — disponibilités, créneaux bloqués, agenda partagé.

Le calendrier logique d'un médecin est la superposition de 4 sources :
  1. Disponibilités (DoctorAvailability) — horaires hebdo ou ponctuels.
  2. Créneaux bloqués (DoctorBlockedSlot) — indisponibilités temporaires.
  3. Rendez-vous PENDING / CONFIRMED — demandes et confirmations.
  4. Demandes en attente (statut PENDING).

Le patient ne voit que les créneaux réellement libres : dans une fenêtre de
disponibilité, sans conflit de rendez-vous et non bloqués.
"""

from datetime import date, datetime, time, timedelta

from sqlalchemy.orm import Session, joinedload

from app.core.business_tz import (
    business_now_naive,
    business_to_utc,
    normalize_to_utc,
    to_business_naive,
)
from app.core.constants import AppointmentStatus, UserRole
from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.core.permissions import get_doctor_id_for_user
from app.models.appointment import Appointment
from app.models.availability import DoctorAvailability
from app.models.blocked_slot import DoctorBlockedSlot
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.user import User
from app.schemas.calendar import (
    AppointmentDecision,
    AvailabilityCreate,
    AvailabilityUpdate,
    BlockedSlotCreate,
)

SLOT_STEP_MINUTES = 30
ACTIVE_STATUSES = (AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED)


def _to_naive(value: datetime | None) -> datetime | None:
    """Heure murale métier (Africa/Tunis) d'une valeur datetime.

    Les instants conscients (timestamptz PostgreSQL, valeurs UTC) sont convertis
    vers l'heure métier ; les valeurs naïves représentent déjà l'heure murale
    métier et sont conservées telles quelles.
    """
    return to_business_naive(value)


def ensure_can_manage_doctor(db: Session, current_user: User, doctor_id: int) -> Doctor:
    """L'utilisateur (admin, médecin ou sa secrétaire) gère ce médecin."""
    if current_user.role == UserRole.ADMIN:
        return _require_doctor(db, doctor_id)
    if current_user.role in (UserRole.DOCTOR, UserRole.SECRETARY):
        own = get_doctor_id_for_user(db, current_user)
        if own == doctor_id:
            return _require_doctor(db, doctor_id)
    raise ForbiddenException("Vous n'avez pas accès à l'agenda de ce médecin")


def _require_doctor(db: Session, doctor_id: int) -> Doctor:
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise NotFoundException("Doctor not found")
    return doctor
# ── Disponibilités ─────────────────────────────────────────────────────────────
def list_availabilities(db: Session, doctor_id: int) -> list[DoctorAvailability]:
    return (
        db.query(DoctorAvailability)
        .filter(DoctorAvailability.doctor_id == doctor_id)
        .order_by(
            DoctorAvailability.weekday.asc(),
            DoctorAvailability.date.asc(),
            DoctorAvailability.start_time.asc(),
        )
        .all()
    )


def create_availability(
    db: Session,
    doctor_id: int,
    data: AvailabilityCreate,
    current_user: User,
) -> DoctorAvailability:
    ensure_can_manage_doctor(db, current_user, doctor_id)
    availability = DoctorAvailability(
        doctor_id=data.doctor_id or doctor_id,
        weekday=data.weekday,
        date=data.date,
        start_time=data.start_time,
        end_time=data.end_time,
        is_active=True,
    )
    db.add(availability)
    db.commit()
    db.refresh(availability)
    return availability


def update_availability(
    db: Session,
    availability_id: int,
    data: AvailabilityUpdate,
    current_user: User,
) -> DoctorAvailability:
    availability = db.query(DoctorAvailability).filter(DoctorAvailability.id == availability_id).first()
    if not availability:
        raise NotFoundException("Availability not found")
    ensure_can_manage_doctor(db, current_user, availability.doctor_id)

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(availability, field, value)
    if availability.weekday is None and availability.date is None:
        raise BadRequestException("Une disponibilité doit avoir un weekday ou une date.")
    db.commit()
    db.refresh(availability)
    return availability


def delete_availability(db: Session, availability_id: int, current_user: User) -> None:
    availability = db.query(DoctorAvailability).filter(DoctorAvailability.id == availability_id).first()
    if not availability:
        raise NotFoundException("Availability not found")
    ensure_can_manage_doctor(db, current_user, availability.doctor_id)
    db.delete(availability)
    db.commit()


# ── Créneaux bloqués ───────────────────────────────────────────────────────────
def list_blocked_slots(db: Session, doctor_id: int) -> list[DoctorBlockedSlot]:
    return (
        db.query(DoctorBlockedSlot)
        .filter(DoctorBlockedSlot.doctor_id == doctor_id)
        .order_by(DoctorBlockedSlot.start_time.asc())
        .all()
    )


def create_blocked_slot(
    db: Session,
    doctor_id: int,
    data: BlockedSlotCreate,
    current_user: User,
) -> DoctorBlockedSlot:
    ensure_can_manage_doctor(db, current_user, doctor_id)
    blocked = DoctorBlockedSlot(
        doctor_id=doctor_id,
        # Heures murales métier (Africa/Tunis) → instants UTC explicites.
        start_time=normalize_to_utc(data.start),
        end_time=normalize_to_utc(data.end),
        reason=data.reason,
    )
    db.add(blocked)
    db.commit()
    db.refresh(blocked)
    return blocked


def delete_blocked_slot(db: Session, blocked_id: int, current_user: User) -> None:
    blocked = db.query(DoctorBlockedSlot).filter(DoctorBlockedSlot.id == blocked_id).first()
    if not blocked:
        raise NotFoundException("Blocked slot not found")
    ensure_can_manage_doctor(db, current_user, blocked.doctor_id)
    db.delete(blocked)
    db.commit()


# ── Logique de disponibilité ───────────────────────────────────────────────────
def _availability_for_day(db: Session, doctor_id: int, day: date) -> list[DoctorAvailability]:
    """Règles actives s'appliquant à ce jour (weekday récurrent OU date exacte)."""
    return (
        db.query(DoctorAvailability)
        .filter(DoctorAvailability.doctor_id == doctor_id, DoctorAvailability.is_active.is_(True))
        .filter((DoctorAvailability.weekday == day.weekday()) | (DoctorAvailability.date == day))
        .all()
    )


def _has_any_availability(db: Session, doctor_id: int) -> bool:
    return (
        db.query(DoctorAvailability.id)
        .filter(DoctorAvailability.doctor_id == doctor_id, DoctorAvailability.is_active.is_(True))
        .first()
        is not None
    )


def _appointment_conflicts(
    db: Session,
    doctor_id: int,
    start: datetime,
    end: datetime,
    exclude_appointment_id=None,
    statuses: tuple[AppointmentStatus, ...] = ACTIVE_STATUSES,
) -> bool:
    query = db.query(Appointment).filter(
        Appointment.doctor_id == doctor_id, Appointment.status.in_(statuses)
    )
    if exclude_appointment_id:
        query = query.filter(Appointment.id != exclude_appointment_id)
    for apt in query.all():
        apt_start = _to_naive(apt.scheduled_at)
        apt_end = apt_start + timedelta(minutes=apt.duration_minutes)
        if apt_start < end and apt_end > start:
            return True
    return False


def _blocked_conflicts(db: Session, doctor_id: int, start: datetime, end: datetime) -> bool:
    for slot in db.query(DoctorBlockedSlot).filter(DoctorBlockedSlot.doctor_id == doctor_id).all():
        s = _to_naive(slot.start_time)
        e = _to_naive(slot.end_time)
        if s < end and e > start:
            return True
    return False


def _day_is_covered(db: Session, doctor_id: int, start: datetime, end: datetime) -> bool:
    entries = _availability_for_day(db, doctor_id, start.date())
    for entry in entries:
        window_start = datetime.combine(start.date(), entry.start_time)
        window_end = datetime.combine(start.date(), entry.end_time)
        if window_start <= start and window_end >= end:
            return True
    return False


def check_slot_available(
    db: Session,
    doctor_id: int,
    start: datetime,
    end: datetime,
    exclude_appointment_id: int | None = None,
    *,
    enforce_availability: bool = False,
    statuses: tuple[AppointmentStatus, ...] = ACTIVE_STATUSES,
) -> bool:
    """Vérification systématique des conflits (création ET validation).

    - Rendez-vous dont le statut est dans ``statuses`` et qui se chevauchent
      → indisponible. Par défaut PENDING + CONFIRMED (création/déplacement) ;
      la validation d'une confirmation passe ``CONFIRMED`` seul, car une simple
      demande PENDING n'occupe pas encore définitivement le créneau.
    - Créneau bloqué → indisponible.
    - Si le médecin a configuré des disponibilités, le créneau doit être dans
      une fenêtre de disponibilité. Mode hérité (aucune disponibilité
      configurée) → tout l'emploi du temps reste autorisé.
    """
    # Toutes les comparaisons se font en heure murale métier (Africa/Tunis) :
    # les entrées sont des instants UTC (conscients) ou naïfs représentant UTC.
    start = to_business_naive(start)
    end = to_business_naive(end)
    if _appointment_conflicts(db, doctor_id, start, end, exclude_appointment_id, statuses):
        return False
    if _blocked_conflicts(db, doctor_id, start, end):
        return False
    if enforce_availability or _has_any_availability(db, doctor_id):
        return _day_is_covered(db, doctor_id, start, end)
    return True


# ── Créneaux libres (vision patient) ───────────────────────────────────────────
def _slot_free(db: Session, doctor_id: int, start: datetime, end: datetime) -> bool:
    return not _appointment_conflicts(db, doctor_id, start, end) and not _blocked_conflicts(
        db, doctor_id, start, end
    )


def get_available_slots(
    db: Session,
    doctor_id: int,
    start_date: date,
    end_date: date,
    duration_minutes: int = 30,
) -> list[dict]:
    """Créneaux réellement libres, par pas régulier, dans la fenêtre demandée."""
    step = timedelta(minutes=duration_minutes)
    now = business_now_naive()  # « maintenant » en heure métier Africa/Tunis
    slots_by_day: dict = {}

    day = start_date
    while day <= end_date:
        for entry in _availability_for_day(db, doctor_id, day):
            window_start = datetime.combine(day, entry.start_time)
            window_end = datetime.combine(day, entry.end_time)
            slot = window_start
            while slot + step <= window_end:
                if slot >= now and _slot_free(db, doctor_id, slot, slot + step):
                    slots_by_day.setdefault(day, []).append(slot)
                slot += step
        day += timedelta(days=1)

    ordered: list[dict] = []
    for current_day in sorted(slots_by_day.keys()):
        for slot in sorted(slots_by_day[current_day]):
            ordered.append({"start": slot, "end": slot + step})
    return ordered


# ── Agenda partagé (médecin / secrétaire) ─────────────────────────────────────
def get_calendar(
    db: Session,
    doctor_id: int,
    start_date: date,
    end_date: date,
) -> dict:
    """Agrège disponibilités, blocages et rendez-vous sur la période demandée."""
    # Bornes exprimées en heure métier puis converties en instants UTC afin de
    # comparer correctement aux colonnes timestamptz.
    start_dt = business_to_utc(datetime.combine(start_date, time.min))
    end_dt = business_to_utc(datetime.combine(end_date, time.max))

    blocked = (
        db.query(DoctorBlockedSlot)
        .filter(
            DoctorBlockedSlot.doctor_id == doctor_id,
            DoctorBlockedSlot.start_time < end_dt,
            DoctorBlockedSlot.end_time > start_dt,
        )
        .order_by(DoctorBlockedSlot.start_time.asc())
        .all()
    )

    appointments = (
        db.query(Appointment)
        .options(joinedload(Appointment.patient).joinedload(Patient.user))
        .filter(
            Appointment.doctor_id == doctor_id,
            Appointment.scheduled_at >= start_dt,
            Appointment.scheduled_at <= end_dt,
            Appointment.status != AppointmentStatus.REJECTED,
        )
        .order_by(Appointment.scheduled_at.asc())
        .all()
    )

    return {
        "doctor_id": doctor_id,
        "availability": list_availabilities(db, doctor_id),
        "blocked_slots": blocked,
        "appointments": appointments,
    }