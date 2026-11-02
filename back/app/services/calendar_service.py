"""n8n calendar webhook integration."""

import logging

import httpx

from app.models.appointment import Appointment
from app.models.patient import Patient
from app.services.event_service import build_webhook_url

logger = logging.getLogger(__name__)


async def trigger_calendar_sync(
    action: str,
    appointment: Appointment,
    patient: Patient,
) -> None:
    """Notify n8n workflow to sync Google Calendar.

    Réutilise exactement la même résolution d'URL que les événements de
    rendez-vous (``build_webhook_url``) pour éviter toute divergence entre
    ``N8N_WEBHOOK_URL`` et ``N8N_CALENDAR_WEBHOOK_PATH``.
    """
    url = build_webhook_url()
    if not url:
        logger.info("N8N webhook URL not configured, skipping calendar sync")
        return

    patient_name = ""
    if patient.user:
        patient_name = f"{patient.user.first_name} {patient.user.last_name}"

    payload = {
        "action": action,
        "appointment_id": appointment.id,
        "patient_name": patient_name,
        "doctor_id": appointment.doctor_id,
        "scheduled_at": appointment.scheduled_at.isoformat(),
        "duration": appointment.duration_minutes,
        "reason": appointment.reason,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            logger.info("n8n calendar sync triggered for appointment %s", appointment.id)
    except Exception as exc:
        logger.error("Failed to trigger n8n webhook: %s", exc)
