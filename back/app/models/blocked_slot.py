"""DoctorBlockedSlot model — créneaux bloqués par le médecin ou la secrétaire.

Un créneau bloqué occupe un intervalle de temps [start, end) pendant lequel
aucun rendez-vous ne peut être pris/confirmé (audition, formation, congé...).
"""

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin


class DoctorBlockedSlot(Base, TimestampMixin):
    """Créneau bloqué dans l'agenda d'un médecin."""

    __tablename__ = "doctor_blocked_slots"
    __table_args__ = (
        CheckConstraint("end_time > start_time", name="ck_blocked_end_after_start"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    doctor_id: Mapped[int] = mapped_column(
        ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False, index=True
    )
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    reason: Mapped[str | None] = mapped_column(String(255), nullable=True)

    doctor = relationship("Doctor", back_populates="blocked_slots")