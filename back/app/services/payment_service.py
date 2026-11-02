"""Payment and invoice business logic."""

from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.orm import Session, joinedload

from app.core.constants import PaymentStatus, UserRole
from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.core.permissions import ensure_user_can_access_patient, get_doctor_id_for_user
from app.models.patient import Patient
from app.models.payment import Payment
from app.models.user import User
from app.schemas.payment import PaymentCreate, PaymentResponse, PaymentUpdate
from app.services.notification_service import send_invoice_email
from app.services.pdf_service import generate_and_store_invoice, get_invoice_presigned_url
from app.services.storage_service import delete_file
from app.core.config import settings


def create_payment(db: Session, data: PaymentCreate, current_user: User) -> Payment:
    """Create a payment record for a patient."""
    if current_user.role not in (UserRole.ADMIN, UserRole.DOCTOR, UserRole.SECRETARY):
        raise ForbiddenException()
    ensure_user_can_access_patient(db, current_user, data.patient_id)

    payment = Payment(
        patient_id=data.patient_id,
        amount=data.amount,
        amount_paid=Decimal("0"),
        due_date=data.due_date,
        description=data.description,
        status=PaymentStatus.PENDING,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


def get_payment(db: Session, payment_id: int, current_user: User) -> Payment:
    """Get payment with permission check."""
    payment = (
        db.query(Payment)
        .options(joinedload(Payment.patient).joinedload(Patient.user))
        .filter(Payment.id == payment_id)
        .first()
    )
    if not payment:
        raise NotFoundException("Payment not found")

    if current_user.role == UserRole.ADMIN:
        return payment
    if current_user.role == UserRole.PATIENT:
        if payment.patient.user_id != current_user.id:
            raise ForbiddenException()
        return payment

    doctor_id = get_doctor_id_for_user(db, current_user)
    if payment.patient.doctor_id != doctor_id:
        raise ForbiddenException()
    return payment


def get_payments_by_patient(db: Session, patient_id: int, current_user: User) -> list[Payment]:
    """List payments for a patient."""
    ensure_user_can_access_patient(db, current_user, patient_id)
    return db.query(Payment).filter(Payment.patient_id == patient_id).order_by(Payment.due_date.desc()).all()


def update_payment(db: Session, payment_id: int, data: PaymentUpdate, current_user: User) -> Payment:
    """Update payment record."""
    payment = get_payment(db, payment_id, current_user)
    update_data = data.model_dump(exclude_unset=True)

    if "amount_paid" in update_data:
        amount_paid = update_data["amount_paid"]
        if amount_paid >= payment.amount:
            payment.status = PaymentStatus.PAID
            payment.paid_at = datetime.now(timezone.utc)
        elif amount_paid > 0:
            payment.status = PaymentStatus.PARTIAL

    for field, value in update_data.items():
        setattr(payment, field, value)

    db.commit()
    db.refresh(payment)
    return payment


def delete_payment(db: Session, payment_id: int, current_user: User) -> None:
    """Delete payment (admin/staff only)."""
    if current_user.role not in (UserRole.ADMIN, UserRole.DOCTOR, UserRole.SECRETARY):
        raise ForbiddenException()
    payment = get_payment(db, payment_id, current_user)
    if payment.invoice_pdf_key:
        delete_file(settings.MINIO_BUCKET_INVOICES, payment.invoice_pdf_key)
    db.delete(payment)
    db.commit()


def generate_invoice(db: Session, payment_id: int, current_user: User) -> PaymentResponse:
    """Generate PDF invoice, store in MinIO, email patient."""
    if current_user.role not in (UserRole.ADMIN, UserRole.DOCTOR, UserRole.SECRETARY):
        raise ForbiddenException()

    payment = get_payment(db, payment_id, current_user)
    generate_and_store_invoice(db, payment)
    db.refresh(payment)

    patient = payment.patient
    if patient and patient.user:
        invoice_url = get_invoice_presigned_url(payment, expiry=86400)
        if invoice_url:
            send_invoice_email(
                patient.user.email,
                f"{patient.user.first_name} {patient.user.last_name}",
                invoice_url,
                payment.invoice_number or "",
            )

    return to_payment_response(payment)


def to_payment_response(payment: Payment) -> PaymentResponse:
    """Build payment response with optional invoice URL."""
    invoice_url = get_invoice_presigned_url(payment) if payment.invoice_pdf_key else None
    return PaymentResponse(
        id=payment.id,
        patient_id=payment.patient_id,
        amount=payment.amount,
        amount_paid=payment.amount_paid,
        status=payment.status,
        due_date=payment.due_date,
        paid_at=payment.paid_at,
        description=payment.description,
        invoice_pdf_key=payment.invoice_pdf_key,
        invoice_number=payment.invoice_number,
        reminder_sent_count=payment.reminder_sent_count,
        last_reminder_at=payment.last_reminder_at,
        created_at=payment.created_at,
        updated_at=payment.updated_at,
        invoice_url=invoice_url,
    )


def get_overdue_payments(db: Session, days_overdue: int = 30, max_reminders: int = 3) -> list[Payment]:
    """Query overdue payments eligible for reminders."""
    from datetime import date, timedelta

    cutoff = date.today() - timedelta(days=days_overdue)
    return (
        db.query(Payment)
        .options(joinedload(Payment.patient).joinedload(Patient.user))
        .filter(
            Payment.status.in_([PaymentStatus.PENDING, PaymentStatus.PARTIAL, PaymentStatus.OVERDUE]),
            Payment.due_date <= cutoff,
            Payment.reminder_sent_count < max_reminders,
        )
        .all()
    )


def send_reminder(db: Session, payment_id: int, current_user: User, note: str | None = None) -> Payment:
    """Send a payment reminder (email + SMS) for a given payment and update reminder counters.

    Increments ``reminder_sent_count`` and sets ``last_reminder_at`` to now.
    """
    from datetime import datetime, timezone

    from app.services.notification_service import send_payment_reminder_email, send_payment_reminder_sms

    payment = get_payment(db, payment_id, current_user)

    patient = payment.patient
    if not patient or not patient.user:
        raise BadRequestException("Patient introuvable pour ce paiement.")

    user = patient.user
    remaining = payment.amount - payment.amount_paid
    due_date_str = payment.due_date.isoformat() if payment.due_date else ""

    # Email
    if user.email:
        send_payment_reminder_email(
            to_email=user.email,
            patient_name=f"{user.first_name} {user.last_name}",
            amount=f"{remaining:.2f} DT",
            due_date=due_date_str,
        )

    # SMS (optionnel)
    if user.phone:
        send_payment_reminder_sms(
            to_phone=user.phone,
            amount=f"{remaining:.2f} DT",
            due_date=due_date_str,
        )

    # Incrémenter les compteurs
    payment.reminder_sent_count = (payment.reminder_sent_count or 0) + 1
    payment.last_reminder_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(payment)

    # Notification in-app pour le patient (centre de notifications).
    # Chaque relance crée une notification (pas de dedup_key → pas d'idempotence).
    try:
        from app.core.constants import NotificationType
        from app.schemas.notification import NotificationCreate
        from app.services.notification_store import create_notification

        message = note or (
            f"Relance pour solde restant dû de {remaining:.2f} DT "
            f"(échéance : {due_date_str})."
        )
        create_notification(
            db,
            NotificationCreate(
                patient_id=patient.id,
                title="Relance de paiement",
                message=message,
                type=NotificationType.DEBT_REMINDER.value,
                related_entity_id=payment.id,
                related_entity_type="payment",
            ),
            current_user,
        )
    except Exception:
        import logging

        logging.getLogger(__name__).warning(
            "Notification de relance non créée pour le patient %s (paiement %s)",
            patient.id,
            payment.id,
            exc_info=True,
        )

    return payment
