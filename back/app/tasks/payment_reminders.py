"""Payment reminder scheduled tasks."""

import logging
from datetime import datetime, timezone

from app.core.constants import PaymentStatus
from app.database.session import SessionLocal
from app.services.notification_service import send_payment_reminder_email, send_payment_reminder_sms
from app.services.payment_service import get_overdue_payments

logger = logging.getLogger(__name__)


def send_payment_reminders() -> None:
    """Send payment reminders for overdue invoices."""
    db = SessionLocal()
    try:
        payments = get_overdue_payments(db)
        logger.info("Processing %d payment reminders", len(payments))

        for payment in payments:
            patient = payment.patient
            if not patient or not patient.user:
                continue

            user = patient.user
            amount_str = f"{payment.amount - payment.amount_paid:.2f} €"
            due_str = payment.due_date.strftime("%d/%m/%Y")
            patient_name = f"{user.first_name} {user.last_name}"

            if user.email:
                send_payment_reminder_email(user.email, patient_name, amount_str, due_str)
            if user.phone:
                send_payment_reminder_sms(user.phone, amount_str, due_str)

            payment.status = PaymentStatus.OVERDUE
            payment.reminder_sent_count += 1
            payment.last_reminder_at = datetime.now(timezone.utc)
            db.commit()
    except Exception as exc:
        logger.error("Payment reminder job failed: %s", exc)
        db.rollback()
    finally:
        db.close()
