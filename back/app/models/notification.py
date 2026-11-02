"""In-app notification model (patient space)."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import NotificationType
from app.database.base import Base, TimestampMixin


class Notification(Base, TimestampMixin):
    """Notification displayed inside the patient space."""

    __tablename__ = "notifications"
    __table_args__ = (
        Index("ix_notifications_patient_read", "patient_id", "is_read"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    patient_id: Mapped[int] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType, name="notification_type"),
        nullable=False,
        index=True,
    )
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    related_entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    related_entity_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    reminder_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # Clé anti-doublon logique (ex: "appointment:15:j7").
    # NULL autorisé (PostgreSQL) pour les notifications sans correspondance.
    dedup_key: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)

    patient = relationship("Patient", back_populates="notifications")