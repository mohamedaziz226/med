"""Document API routes."""

from fastapi import APIRouter, File, Form, UploadFile

from app.api.deps import CurrentUser, DbSession
from app.core.constants import DocumentType
from app.schemas.document import DocumentResponse, DocumentValidateRequest
from app.schemas.document_request import (
    DocumentRequestCreate,
    DocumentRequestResponse,
    DocumentRequestUpdate,
)
from app.services import document_service
from app.services import document_request_service

router = APIRouter(prefix="/documents", tags=["documents"])



@router.post("/upload", response_model=DocumentResponse, status_code=201)
async def upload_document(
    db: DbSession,
    current_user: CurrentUser,
    file: UploadFile = File(...),
    patient_id: int = Form(...),
    type: DocumentType = Form(...),
    title: str = Form(...),
    description: str | None = Form(None),
) -> DocumentResponse:
    from app.schemas.document import DocumentCreate

    metadata = DocumentCreate(
        patient_id=patient_id,
        type=type,
        title=title,
        description=description,
    )
    return await document_service.upload_document(db, file, metadata, current_user)


@router.get("/patient/{patient_id}", response_model=list[DocumentResponse])
def list_patient_documents(
    patient_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> list[DocumentResponse]:
    return document_service.get_documents_by_patient(db, patient_id, current_user)


@router.post("/{document_id}/validate", response_model=DocumentResponse)
def validate_document(
    document_id: int,
    data: DocumentValidateRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> DocumentResponse:
        return document_service.validate_document(db, document_id, data, current_user)


@router.delete("/{document_id}", status_code=204)
def delete_document(
    document_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> None:
    """Supprime un document (base de données + fichier MinIO).

    - Patient : uniquement ses propres documents.
    - Staff (médecin/secrétaire) : les documents des patients du cabinet.
    """
    document_service.delete_document(db, document_id, current_user)
    return None


# ── Document requests (patient → secretary/doctor) ──────────────────────


@router.post(
    "/requests",
    response_model=DocumentRequestResponse,
    status_code=201,
)
def create_document_request(
    data: DocumentRequestCreate,
    db: DbSession,
    current_user: CurrentUser,
):
    return document_request_service.create_request(db, data, current_user)


@router.get("/requests", response_model=list[DocumentRequestResponse])
def list_document_requests(
    db: DbSession,
    current_user: CurrentUser,
):
    return document_request_service.list_requests(db, current_user)


@router.get("/requests/{request_id}", response_model=DocumentRequestResponse)
def get_document_request(
    request_id: int,
    db: DbSession,
    current_user: CurrentUser,
):
    return document_request_service.get_request(db, request_id, current_user)


@router.patch(
    "/requests/{request_id}", response_model=DocumentRequestResponse
)
def update_document_request(
    request_id: int,
    data: DocumentRequestUpdate,
    db: DbSession,
    current_user: CurrentUser,
):
    return document_request_service.update_request(db, request_id, data, current_user)


@router.delete("/requests/{request_id}", status_code=204)
def delete_document_request(
    request_id: int,
    db: DbSession,
    current_user: CurrentUser,
):
    document_request_service.delete_request(db, request_id, current_user)
    return None

