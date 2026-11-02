"""In-app notification persistence service (patient notification centre)."""

from sqlalchemy import update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.constants import NotificationType, UserRole
from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.core.permissions import get_doctor_id_for_user
from app.models.notification import Notification
from app.models.patient import Patient
from app.models.user import User
from app.schemas.notification import NotificationCreate, NotificationResponse


def _normalize_type(raw: str) -> NotificationType:
    """Normalise la casse (ex: APPOINTMENT_REMINDER → appointment_reminder)."""
    try:
        return NotificationType(raw.strip().lower())
    except ValueError as exc:
        raise BadRequestException(
            "Type de notification invalide. Valeurs acceptées : "
            + ", ".join(t.value for t in NotificationType)
        ) from exc


def _get_patient_id_for_user(db: Session, user: User) -> int | None:
    """patient_id correspondant au patient connecté."""
    if user.role != UserRole.PATIENT:
        return None
    patient = db.query(Patient).filter(Patient.user_id == user.id).first()
    return patient.id if patient else None


def _allowed_patient_ids(db: Session, user: User) -> set[int] | None:
    """Ids patients accessibles → None = tous (admin)."""
    if user.role == UserRole.PATIENT:
        pid = _get_patient_id_for_user(db, user)
        return {pid} if pid else set()
    if user.role == UserRole.ADMIN:
        return None
    doctor_id = get_doctor_id_for_user(db, user)
    if doctor_id is None:
        return set()
    rows = db.query(Patient.id).filter(Patient.doctor_id == doctor_id).all()
    return {row[0] for row in rows}


def _ensure_can_target_patient(db: Session, user: User, patient_id: int) -> Patient:
    """Vérifie que l'utilisateur peut créer une notification pour ce patient."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise NotFoundException("Patient not found")

    if user.role == UserRole.PATIENT:
        if patient.user_id != user.id:
            raise ForbiddenException("Cannot create notifications for another patient")
        return patient
    if user.role in (UserRole.DOCTOR, UserRole.SECRETARY):
        doctor_id = get_doctor_id_for_user(db, user)
        if doctor_id is None or patient.doctor_id != doctor_id:
            raise ForbiddenException("Patient does not belong to your practice")
    # ADMIN : accès complet
    return patient


def _accessible_notification(db: Session, user: User, notification_id: int) -> Notification:
    """Retourne la notification si elle est accessible par l'utilisateur."""
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notification:
        raise NotFoundException("Notification not found")

    allowed = _allowed_patient_ids(db, user)
    if allowed is None or notification.patient_id in allowed:
        return notification
    raise NotFoundException("Notification not found")
def create_notification(db: Session, data: NotificationCreate, current_user: User) -> Notification:
    """Crée une notification (idempotente via la clé anti-doublon).

    Si ``dedup_key`` est fourni dans le payload (depuis n8n), il est utilisé directement.
    Sinon, une clé est générée automatiquement à partir de patient_id + related_entity_id + reminder_type.
    """
    _ensure_can_target_patient(db, current_user, data.patient_id)
    notification_type = _normalize_type(data.type)

    # Anti-doublon logique : utiliser le dedup_key fourni ou le générer
    dedup_key = data.dedup_key
    if not dedup_key and data.related_entity_type == "appointment" and data.reminder_type and data.related_entity_id:
        dedup_key = f"appointment:{data.patient_id}:{data.related_entity_id}:{data.reminder_type}"

    if dedup_key:
        existing = db.query(Notification).filter(Notification.dedup_key == dedup_key).first()
        if existing:
            return existing

    notification = Notification(
        patient_id=data.patient_id,
        title=data.title,
        message=data.message,
        type=notification_type,
        related_entity_id=data.related_entity_id,
        related_entity_type=data.related_entity_type,
        reminder_type=data.reminder_type,
        dedup_key=dedup_key,
    )

    try:
        db.add(notification)
        db.commit()
        db.refresh(notification)
    except IntegrityError:
        # Course possible : la contrainte UNIQUE a tranché → renvoyer l'existante
        db.rollback()
        if dedup_key:
            existing = db.query(Notification).filter(Notification.dedup_key == dedup_key).first()
            if existing:
                return existing
        raise
    return notification


def list_notifications(
    db: Session,
    current_user: User,
    unread_only: bool = False,
    limit: int = 50,
) -> list[Notification]:
    """Notifications du patient connecté (ou des patients du staff, filtrées)."""
    allowed = _allowed_patient_ids(db, current_user)
    if allowed is not None and not allowed:
        return []

    query = db.query(Notification)
    if allowed is not None:
        query = query.filter(Notification.patient_id.in_(allowed))
    if unread_only:
        query = query.filter(Notification.is_read.is_(False))

    return (
        query.order_by(Notification.created_at.desc(), Notification.id.desc())
        .limit(limit)
        .all()
    )


def get_unread_count(db: Session, current_user: User) -> int:
    """Compteur personnel de notifications non lues (centre patient).

    Le compteur est individuel : un patient compte SES notifications non lues.
    Le staff / admin peut lister les notifications de ses patients mais son
    propre compteur (il n'a pas de profil patient) reste à 0.
    """
    if current_user.role != UserRole.PATIENT:
        return 0
    pid = _get_patient_id_for_user(db, current_user)
    if pid is None:
        return 0
    return (
        db.query(Notification.id)
        .filter(Notification.patient_id == pid, Notification.is_read.is_(False))
        .count()
    )
def mark_notification_as_read(db: Session, current_user: User, notification_id: int) -> Notification:
    """Marque une notification comme lue (uniquement si accessible à l'utilisateur)."""
    notification = _accessible_notification(db, current_user, notification_id)
    if not notification.is_read:
        from datetime import datetime, timezone

        notification.is_read = True
        notification.read_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(notification)
    return notification


def mark_all_notifications_read(db: Session, current_user: User) -> int:
    """Marque toutes les notifications accessibles comme lues → nombre mis à jour."""
    from datetime import datetime, timezone

    allowed = _allowed_patient_ids(db, current_user)
    query = db.query(Notification.id).filter(Notification.is_read.is_(False))
    if allowed is not None:
        query = query.filter(Notification.patient_id.in_(allowed))

    ids = [row[0] for row in query.all()]
    if not ids:
        return 0

    result = db.execute(
        update(Notification)
        .where(Notification.id.in_(ids))
        .values(is_read=True, read_at=datetime.now(timezone.utc))
    )
    db.commit()
    return result.rowcount or len(ids)


def to_notification_response(notification: Notification) -> NotificationResponse:
    return NotificationResponse.model_validate(notification)