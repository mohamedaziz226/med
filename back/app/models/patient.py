"""Patient profile model."""

from datetime import date

from sqlalchemy import Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin


class Patient(Base, TimestampMixin):
    """Patient linked to a doctor."""

    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id", ondelete="CASCADE"), index=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    blood_type: Mapped[str | None] = mapped_column(String(10), nullable=True)
    allergies: Mapped[str | None] = mapped_column(Text, nullable=True)
    medical_history: Mapped[str | None] = mapped_column(Text, nullable=True)
    emergency_contact_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    emergency_contact_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    social_security_number: Mapped[str | None] = mapped_column(String(50), nullable=True)

    user = relationship("User", back_populates="patient_profile")
    doctor = relationship("Doctor", back_populates="patients")
    appointments = relationship("Appointment", back_populates="patient")
    documents = relationship("Document", back_populates="patient")
    document_requests = relationship(
        "DocumentRequest", back_populates="patient", cascade="all, delete-orphan"
    )
    payments = relationship("Payment", back_populates="patient")
    notifications = relationship("Notification", back_populates="patient")
