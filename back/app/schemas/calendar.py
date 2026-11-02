"""Calendar Pydantic schemas — disponibilités, créneaux bloqués, agenda partagé."""

from datetime import datetime, time
import datetime as dt

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.appointment import AppointmentResponse


# ── Disponibilités ────────────────────────────────────────────────────────────
class AvailabilityCreate(BaseModel):
    """Créer un créneau de disponibilité.

    Soit ``weekday`` (0=lundi ... 6=dimanche) pour une règle hebdomadaire,
    soit ``date`` pour une disponibilité ponctuelle.
    """

    doctor_id: int | None = None
    weekday: int | None = Field(default=None, ge=0, le=6)
    date: dt.date | None = None
    start_time: time
    end_time: time

    @model_validator(mode="after")
    def _exactly_one_mode(self):
        if not ((self.weekday is None) != (self.date is None)):
            raise ValueError("Précisez soit weekday, soit date (jamais les deux).")
        if self.start_time >= self.end_time:
            raise ValueError("start_time doit être antérieur à end_time.")
        return self


class AvailabilityUpdate(BaseModel):
    weekday: int | None = Field(default=None, ge=0, le=6)
    date: dt.date | None = None
    start_time: time | None = None
    end_time: time | None = None
    is_active: bool | None = None

    @model_validator(mode="after")
    def _check_times(self):
        if self.start_time and self.end_time and self.start_time >= self.end_time:
            raise ValueError("start_time doit être antérieur à end_time.")
        return self


class AvailabilityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    doctor_id: int
    weekday: int | None
    date: dt.date | None
    start_time: time
    end_time: time
    is_active: bool
    created_at: datetime
    updated_at: datetime


# ── Créneaux bloqués ──────────────────────────────────────────────────────────
class BlockedSlotCreate(BaseModel):
    start: datetime
    end: datetime
    reason: str | None = Field(default=None, max_length=255)

    @model_validator(mode="after")
    def _check_order(self):
        if self.end <= self.start:
            raise ValueError("La fin doit être postérieure au début.")
        return self


class BlockedSlotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    doctor_id: int
    start_time: datetime
    end_time: datetime
    reason: str | None
    created_at: datetime
    updated_at: datetime


# ── Créneau disponible proposé au patient ─────────────────────────────────────
class AvailableSlotResponse(BaseModel):
    start: datetime
    end: datetime


# ── Vue calendrier partagé (médecin / secrétaire) ─────────────────────────────
class CalendarResponse(BaseModel):
    doctor_id: int
    availability: list[AvailabilityResponse]
    blocked_slots: list[BlockedSlotResponse]
    appointments: list[AppointmentResponse]


# ── Décision secrétaire/médecin sur une demande de rendez-vous ───────────────
class AppointmentDecision(BaseModel):
    """Corps des actions accept / reject / reschedule.

    ``proposed_at`` est le nouveau créneau proposé dans le cas d'une
    proposition d'autre créneau (reschedule). ``reason`` est optionnel.
    """

    proposed_at: datetime | None = None
    reason: str | None = Field(default=None, max_length=500)