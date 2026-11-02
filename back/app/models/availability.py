"""DoctorAvailability model — horaires de disponibilité du médecin.

Deux modes, mutuellement exclusifs :
- ``weekday`` : règle hebdomadaire récurrente (0 = lundi ... 6 = dimanche).
- ``date``   : disponibilité ponctuelle pour une journée précise (jour ajouté,
  heure des congés, jour exceptionnel...).
"""

from datetime import date, time

from sqlalchemy import CheckConstraint, Date, ForeignKey, Index, Integer, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin


class DoctorAvailability(Base, TimestampMixin):
    """Créneau de disponibilité d'un médecin."""

    __tablename__ = "doctor_availability"
    __table_args__ = (
        CheckConstraint(
            "(weekday IS NULL) <> (date IS NULL)",
            name="ck_availability_exactly_one_mode",
        ),
        CheckConstraint("start_time < end_time", name="ck_availability_start_before_end"),
        Index("ix_availability_doctor_weekday", "doctor_id", "weekday"),
        Index("ix_availability_doctor_date", "doctor_id", "date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    doctor_id: Mapped[int] = mapped_column(
        ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Mode hebdomadaire récurrent (0=lundi ... 6=dimanche) OU un jour précis.
    weekday: Mapped[int | None] = mapped_column(Integer, nullable=True)
    date: Mapped[date | None] = mapped_column(Date, nullable=True)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    doctor = relationship("Doctor", back_populates="availabilities")