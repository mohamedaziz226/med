"""Secretary profile model."""

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin


class Secretary(Base, TimestampMixin):
    """Secretary linked to a doctor."""

    __tablename__ = "secretaries"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id", ondelete="CASCADE"), index=True)

    user = relationship("User", back_populates="secretary_profile")
    doctor = relationship("Doctor", back_populates="secretaries")
