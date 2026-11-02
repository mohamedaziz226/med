"""Document request model — patient asks secretary/doctor for a document."""

from sqlalchemy import Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import DocumentRequestStatus, DocumentType
from app.database.base import Base, TimestampMixin


class DocumentRequest(Base, TimestampMixin):
    """A request from a patient for a specific document type."""

    __tablename__ = "document_requests"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    patient_id: Mapped[int] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), index=True
    )
    doctor_id: Mapped[int | None] = mapped_column(
        ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True, index=True
    )
    type: Mapped[DocumentType] = mapped_column(
        Enum(DocumentType, name="document_type"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[DocumentRequestStatus] = mapped_column(
        Enum(DocumentRequestStatus, name="document_request_status"),
        default=DocumentRequestStatus.PENDING,
        nullable=False,
    )
    response: Mapped[str | None] = mapped_column(Text, nullable=True)
    responded_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    patient = relationship("Patient", back_populates="document_requests")
    doctor = relationship("Doctor")
    respondent = relationship("User")