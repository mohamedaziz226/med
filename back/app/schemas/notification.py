"""Notification Pydantic schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.core.constants import NotificationType


class NotificationCreate(BaseModel):
    """Payload utilisé par n8n / le backend pour créer une notification.

    ``type`` accepte n'importe quelle casse (ex: "APPOINTMENT_REMINDER"),
    il est normalisé en minuscules côté service ("appointment_reminder").
    
    ``dedup_key`` est utilisé pour éviter les doublons (idempotence).
    Format: "appointment:{patient_id}:{appointment_id}:{notification_type}"
    """

    patient_id: int
    title: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1)
    type: str = Field(..., max_length=50)
    related_entity_id: int | None = None
    related_entity_type: str | None = Field(default=None, max_length=50)
    reminder_type: str | None = Field(default=None, max_length=50)
    dedup_key: str | None = Field(default=None, max_length=255)


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    title: str
    message: str
    type: NotificationType
    is_read: bool
    read_at: datetime | None
    related_entity_id: int | None
    related_entity_type: str | None
    reminder_type: str | None
    dedup_key: str | None = None
    created_at: datetime
    updated_at: datetime


class UnreadCountResponse(BaseModel):
    count: int