"""Pydantic schemas for document requests."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.core.constants import DocumentRequestStatus, DocumentType


class DocumentRequestCreate(BaseModel):
    patient_id: int
    type: DocumentType
    title: str
    message: str | None = None


class DocumentRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    doctor_id: int | None
    type: DocumentType
    title: str
    message: str | None
    status: DocumentRequestStatus
    response: str | None
    responded_by: int | None
    created_at: datetime
    updated_at: datetime
    patient_first_name: str | None = None
    patient_last_name: str | None = None


class DocumentRequestUpdate(BaseModel):
    status: DocumentRequestStatus | None = None
    response: str | None = None
    responded_by: int | None = None