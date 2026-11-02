"""Appointment model."""

from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import AppointmentStatus
from app.database.base import Base, TimestampMixin


class Appointment(Base, TimestampMixin):
    """Medical appointment between patient and doctor."""

    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), index=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id", ondelete="CASCADE"), index=True)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    status: Mapped[AppointmentStatus] = mapped_column(
        Enum(AppointmentStatus, name="appointment_status"),
        default=AppointmentStatus.PENDING,
        nullable=False,
    )
    reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    google_event_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reminder_sent: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # Créneau alternatif proposé par la secrétaire / le médecin (PENDING conserve
    # son statut tant que la demande n'est pas acceptée ou refusée).
    proposed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    patient = relationship("Patient", back_populates="appointments")
    doctor = relationship("Doctor", back_populates="appointments")

    @property
    def doctor_name(self) -> str | None:
        """Nom complet du médecin (ex: 'Dr Jean Dupont'), pour les notifications."""
        user = getattr(self.doctor, "user", None)
        if user is None:
            return None
        first = (user.first_name or "").strip()
        last = (user.last_name or "").strip()
        full = f"{first} {last}".strip()
        return f"Dr {full}" if full else None
