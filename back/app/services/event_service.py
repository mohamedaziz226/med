"""Émission d'événements de rendez-vous vers n8n.

Le backend reste la source de vérité : chaque transition de statut d'un
rendez-vous (demande, confirmation, refus, proposition d'autre créneau) émet
un événement POST nominatif vers n8n, qui pourra ensuite orchestrer les emails
/ notifications / synchro Google Calendar.

Événements préparés :
  - appointment.requested     (demande émise par le patient / le staff)
  - appointment.confirmed     (acceptée, PENDING -> CONFIRMED)
  - appointment.rejected      (refusée, PENDING -> REJECTED)
  - appointment.rescheduled   (autre créneau proposé)
  - appointment.cancelled     (annulée via PATCH /appointments/{id})
"""

import logging

import httpx

from app.core.config import settings
from app.models.appointment import Appointment
from app.models.patient import Patient

logger = logging.getLogger(__name__)


def build_webhook_url() -> str | None:
    """Resolve l'URL complète du webhook n8n, sans jamais créer de doublons.

    La variable ``N8N_WEBHOOK_URL`` peut être fournie sous trois formes :
      - racine du serveur   : ``http://n8n:5678``
      - avec préfixe webhook : ``http://n8n:5678/webhook``
      - URL complète         : ``http://n8n:5678/webhook/appointment-sync``
    Dans tous les cas le résultat contient ``/webhook/<chemin>`` UNE seule fois
    (jamais ``/webhook/webhook/...`` ni ``.../appointment-sync/appointment-sync``).
    """
    raw = (settings.N8N_WEBHOOK_URL or "").strip()
    if not raw:
        return None
    url = raw.rstrip("/")
    path = (settings.N8N_CALENDAR_WEBHOOK_PATH or "").strip().strip("/")

    if not path:
        return url

    # Déjà terminée par le chemin configuré → ne rien ajouter (anti-doublon).
    if url.endswith(f"/{path}"):
        return url

    # Préfixer /webhook si l'URL n'en contient pas encore (webhook ou webhook-test).
    segments = [seg for seg in url.split("/") if seg]
    if not any(seg == "webhook" or seg.startswith("webhook-") for seg in segments):
        url = f"{url}/webhook"
    return f"{url}/{path}"


def _patient_name(patient: Patient | None) -> str:
    if patient and patient.user:
        return f"{patient.user.first_name} {patient.user.last_name}".strip()
    return "Patient"


def _build_payload(event: str, appointment: Appointment, patient: Patient | None) -> dict:
    return {
        "event": event,
        "appointment_id": appointment.id,
        "patient_id": appointment.patient_id,
        "patient_name": _patient_name(patient),
        "doctor_id": appointment.doctor_id,
        "scheduled_at": appointment.scheduled_at.isoformat() if appointment.scheduled_at else None,
        "proposed_at": appointment.proposed_at.isoformat() if appointment.proposed_at else None,
        "duration": appointment.duration_minutes,
        "status": appointment.status.value if appointment.status else None,
        "reason": appointment.reason,
    }


async def emit_appointment_event(event: str, appointment: Appointment, patient: Patient | None) -> None:
    """POST l'événement vers le webhook n8n (fire-and-forget sécurisé)."""
    url = build_webhook_url()
    if not url:
        logger.info("N8N webhook URL not configured, skipping event %s", event)
        return
    payload = _build_payload(event, appointment, patient)
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
        logger.info("n8n event emitted: %s for appointment %s", event, appointment.id)
    except Exception as exc:  # noqa: BLE001 — jamais bloquer le flux principal
        logger.error("Failed to emit n8n event %s: %s", event, exc)