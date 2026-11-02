"""Appointment Pydantic schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.core.constants import AppointmentStatus


class AppointmentCreate(BaseModel):
    patient_id: int
    doctor_id: int
    scheduled_at: datetime
    duration_minutes: int = Field(default=30, ge=5, le=480)
    reason: str | None = None
    notes: str | None = None


class AppointmentUpdate(BaseModel):
    scheduled_at: datetime | None = None
    duration_minutes: int | None = Field(default=None, ge=5, le=480)
    status: AppointmentStatus | None = None
    reason: str | None = None
    notes: str | None = None


class AppointmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    doctor_id: int
    scheduled_at: datetime
    duration_minutes: int
    status: AppointmentStatus
    reason: str | None
    notes: str | None
    google_event_id: str | None
    reminder_sent: int
    proposed_at: datetime | None
    doctor_name: str | None = None
    created_at: datetime
    updated_at: datetime


class CalendarSyncWebhook(BaseModel):
    appointment_id: int
    google_event_id: str
    action: str
