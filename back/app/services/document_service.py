"""Document upload and validation service."""

import io

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.constants import DocumentStatus, UserRole
from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.core.permissions import ensure_user_can_access_patient, get_doctor_id_for_user
from app.models.document import Document
from app.models.patient import Patient
from app.models.user import User
from app.schemas.document import DocumentCreate, DocumentResponse, DocumentValidateRequest
from app.services.storage_service import (
    build_object_key,
    delete_file,
    get_presigned_url,
    upload_file,
)


async def upload_document(
    db: Session,
    file: UploadFile,
    metadata: DocumentCreate,
    current_user: User,
) -> DocumentResponse:
    """Upload file to MinIO and persist metadata."""
    patient = ensure_user_can_access_patient(db, current_user, metadata.patient_id)

    if current_user.role == UserRole.PATIENT and patient.user_id != current_user.id:
        raise ForbiddenException("Patients can only upload their own documents")

    if not file.filename:
        raise BadRequestException("Filename is required")

    content = await file.read()
    if not content:
        raise BadRequestException("Empty file")

    object_key = build_object_key(
        patient.doctor_id,
        patient.id,
        metadata.type.value,
        file.filename,
    )
    upload_file(
        settings.MINIO_BUCKET_MEDICAL,
        object_key,
        io.BytesIO(content),
        len(content),
        file.content_type or "application/octet-stream",
    )

    document = Document(
        patient_id=patient.id,
        uploaded_by=current_user.id,
        type=metadata.type,
        title=metadata.title,
        description=metadata.description,
        minio_object_key=object_key,
        filename=file.filename,
        file_size=len(content),
        mime_type=file.content_type or "application/octet-stream",
        status=DocumentStatus.PENDING,
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return to_document_response(document)


def get_documents_by_patient(db: Session, patient_id: int, current_user: User) -> list[DocumentResponse]:
    """List documents for a patient."""
    ensure_user_can_access_patient(db, current_user, patient_id)
    documents = (
        db.query(Document)
        .filter(Document.patient_id == patient_id)
        .order_by(Document.created_at.desc())
        .all()
    )
    return [to_document_response(doc) for doc in documents]


def validate_document(
    db: Session,
    document_id: int,
    data: DocumentValidateRequest,
    current_user: User,
) -> DocumentResponse:
    """Validate or reject a document (doctor/secretary)."""
    if current_user.role not in (UserRole.ADMIN, UserRole.DOCTOR, UserRole.SECRETARY):
        raise ForbiddenException()

    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise NotFoundException("Document not found")

    patient = db.query(Patient).filter(Patient.id == document.patient_id).first()
    if current_user.role != UserRole.ADMIN:
        doctor_id = get_doctor_id_for_user(db, current_user)
        if not patient or patient.doctor_id != doctor_id:
            raise ForbiddenException()

    if data.status not in (DocumentStatus.VALIDATED, DocumentStatus.REJECTED):
        raise BadRequestException("Status must be validated or rejected")

    document.status = data.status
    document.validated_by = current_user.id
    db.commit()
    db.refresh(document)
    return to_document_response(document)


def delete_document(db: Session, document_id: int, current_user: User) -> None:
    """Delete document from DB and MinIO."""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise NotFoundException("Document not found")

    ensure_user_can_access_patient(db, current_user, document.patient_id)
    if current_user.role == UserRole.PATIENT and document.uploaded_by != current_user.id:
        raise ForbiddenException("Cannot delete this document")

    delete_file(settings.MINIO_BUCKET_MEDICAL, document.minio_object_key)
    db.delete(document)
    db.commit()


def to_document_response(document: Document) -> DocumentResponse:
    """Build document response with presigned URL."""
    url = get_presigned_url(settings.MINIO_BUCKET_MEDICAL, document.minio_object_key)
    return DocumentResponse(
        id=document.id,
        patient_id=document.patient_id,
        uploaded_by=document.uploaded_by,
        validated_by=document.validated_by,
        type=document.type,
        title=document.title,
        description=document.description,
        minio_object_key=document.minio_object_key,
        filename=document.filename,
        file_size=document.file_size,
        mime_type=document.mime_type,
        status=document.status,
        created_at=document.created_at,
        updated_at=document.updated_at,
        download_url=url,
    )
