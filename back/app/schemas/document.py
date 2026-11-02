"""Document Pydantic schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.core.constants import DocumentStatus, DocumentType


class DocumentCreate(BaseModel):
    patient_id: int
    type: DocumentType
    title: str
    description: str | None = None


class DocumentUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: DocumentStatus | None = None


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    uploaded_by: int | None
    validated_by: int | None
    type: DocumentType
    title: str
    description: str | None
    minio_object_key: str
    filename: str
    file_size: int
    mime_type: str
    status: DocumentStatus
    created_at: datetime
    updated_at: datetime
    download_url: str | None = None


class DocumentValidateRequest(BaseModel):
    status: DocumentStatus
