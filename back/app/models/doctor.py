"""Doctor profile model."""

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin


class Doctor(Base, TimestampMixin):
    """Doctor profile linked 1:1 to a user."""

    __tablename__ = "doctors"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    specialty: Mapped[str] = mapped_column(String(150), nullable=False)
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    license_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)

    user = relationship("User", back_populates="doctor_profile")
    secretaries = relationship("Secretary", back_populates="doctor")
    patients = relationship("Patient", back_populates="doctor")
    appointments = relationship("Appointment", back_populates="doctor")
    availabilities = relationship("DoctorAvailability", back_populates="doctor", cascade="all, delete-orphan")
    blocked_slots = relationship("DoctorBlockedSlot", back_populates="doctor", cascade="all, delete-orphan")
