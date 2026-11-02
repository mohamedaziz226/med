"""Webhook endpoints for n8n and external integrations."""

import logging

from fastapi import APIRouter

from app.api.deps import DbSession
from app.core.exceptions import NotFoundException
from app.models.appointment import Appointment
from app.schemas.appointment import CalendarSyncWebhook

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/calendar-sync")
def calendar_sync(data: CalendarSyncWebhook, db: DbSession) -> dict[str, str]:
    """Receive Google Calendar sync callback from n8n."""
    appointment = db.query(Appointment).filter(Appointment.id == data.appointment_id).first()
    if not appointment:
        raise NotFoundException("Appointment not found")

    appointment.google_event_id = data.google_event_id
    db.commit()
    logger.info("Updated google_event_id for appointment %s", data.appointment_id)
    return {"status": "ok"}


@router.post("/n8n-test")
def n8n_test(payload: dict) -> dict:
    """Test endpoint for n8n workflow debugging."""
    logger.info("n8n test webhook received: %s", payload)
    return {"status": "received", "payload": payload}
