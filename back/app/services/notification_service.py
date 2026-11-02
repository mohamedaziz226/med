"""Email and SMS notification service."""

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings
from app.utils.email_templates import (
    appointment_reminder_email_body,
    debt_reminder_email_body,
    invoice_email_body,
    payment_reminder_email_body,
)
from app.utils.sms_templates import appointment_reminder_sms, payment_reminder_sms

logger = logging.getLogger(__name__)


def send_email(to_email: str, subject: str, body: str, html: bool = False) -> bool:
    """Send email via SMTP or simulate in dev."""
    if not settings.smtp_configured:
        print(f"[SIMULATED EMAIL] To: {to_email} | Subject: {subject}\n{body}")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM
        msg["To"] = to_email
        mime_type = "html" if html else "plain"
        msg.attach(MIMEText(body, mime_type, "utf-8"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM, to_email, msg.as_string())
        return True
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to_email, exc)
        return False


def send_sms(to_phone: str, message: str) -> bool:
    """Send SMS via Twilio or simulate in dev."""
    if not settings.twilio_configured:
        print(f"[SIMULATED SMS] To: {to_phone} | {message}")
        return True

    try:
        from twilio.rest import Client

        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        client.messages.create(body=message, from_=settings.TWILIO_PHONE_NUMBER, to=to_phone)
        return True
    except Exception as exc:
        logger.error("Failed to send SMS to %s: %s", to_phone, exc)
        return False


def send_appointment_reminder_email(
    to_email: str,
    patient_name: str,
    doctor_name: str,
    scheduled_at: str,
) -> bool:
    body = appointment_reminder_email_body(patient_name, doctor_name, scheduled_at)
    return send_email(to_email, "Rappel de rendez-vous — MedSecretariat", body, html=True)


def send_payment_reminder_email(
    to_email: str,
    patient_name: str,
    amount: str,
    due_date: str,
) -> bool:
    body = payment_reminder_email_body(patient_name, amount, due_date)
    return send_email(to_email, "Relance de paiement — MedSecretariat", body, html=True)


def send_debt_reminder_email(
    to_email: str,
    patient_name: str,
    remaining_debt: str,
    appointment_date: str,
) -> bool:
    """Rappel de dette avant prochain rendez-vous (alternative backend à n8n/Gmail)."""
    body = debt_reminder_email_body(patient_name, remaining_debt, appointment_date)
    return send_email(to_email, "Rappel concernant votre solde — MedSecretariat", body, html=True)


def send_invoice_email(to_email: str, patient_name: str, invoice_url: str, invoice_number: str) -> bool:
    body = invoice_email_body(patient_name, invoice_url, invoice_number)
    return send_email(to_email, f"Facture {invoice_number} — MedSecretariat", body, html=True)


def send_appointment_reminder_sms(to_phone: str, patient_name: str, scheduled_at: str) -> bool:
    return send_sms(to_phone, appointment_reminder_sms(patient_name, scheduled_at))


def send_payment_reminder_sms(to_phone: str, amount: str, due_date: str) -> bool:
    return send_sms(to_phone, payment_reminder_sms(amount, due_date))
