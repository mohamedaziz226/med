"""Appointment reminder scheduled tasks."""

import logging

from app.core.business_tz import to_business_naive
from app.database.session import SessionLocal
from app.services.appointment_service import REMINDER_BIT_J1, REMINDER_BIT_J7, get_upcoming_appointments
from app.services.notification_service import (
    send_appointment_reminder_email,
    send_appointment_reminder_sms,
)

logger = logging.getLogger(__name__)


def send_appointment_reminders(days_ahead: int = 1, reminder_bit: int = REMINDER_BIT_J1) -> None:
    """Send email and SMS reminders for upcoming appointments."""
    db = SessionLocal()
    try:
        appointments = get_upcoming_appointments(db, days_ahead, reminder_bit)
        logger.info("Processing %d appointment reminders (J-%d)", len(appointments), days_ahead)

        for appointment in appointments:
            patient = appointment.patient
            if not patient or not patient.user:
                continue

            user = patient.user
            # Heure métier affichée au patient (Africa/Tunis), pas l'heure UTC brute.
            scheduled_str = to_business_naive(appointment.scheduled_at).strftime(
                "%d/%m/%Y à %H:%M"
            )
            patient_name = f"{user.first_name} {user.last_name}"

            if user.email:
                send_appointment_reminder_email(
                    user.email,
                    patient_name,
                    "Dr. Cabinet",
                    scheduled_str,
                )
            if user.phone:
                send_appointment_reminder_sms(user.phone, patient_name, scheduled_str)

            appointment.reminder_sent |= reminder_bit
            db.commit()
    except Exception as exc:
        logger.error("Appointment reminder job failed: %s", exc)
        db.rollback()
    finally:
        db.close()
