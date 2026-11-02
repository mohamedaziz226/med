"""Service layer for document requests."""

from sqlalchemy.orm import Session

from app.core.constants import DocumentRequestStatus, UserRole
from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.core.permissions import ensure_user_can_access_patient, get_doctor_id_for_user
from app.models.document_request import DocumentRequest
from app.models.patient import Patient
from app.models.user import User
from app.schemas.document_request import (
    DocumentRequestCreate,
    DocumentRequestResponse,
    DocumentRequestUpdate,
)


def _patient_scope(db: Session, user: User) -> int | None:
    """Return the doctor.id the user (secretary/doctor) can access, or None for admin."""
    if user.role == UserRole.ADMIN:
        return None
    return get_doctor_id_for_user(db, user)


def to_response(db: Session, request: DocumentRequest) -> DocumentRequestResponse:
    """Build response enriched with the patient's display name."""
    patient = db.query(Patient).filter(Patient.id == request.patient_id).first()
    data = DocumentRequestResponse.model_validate(request)
    if patient and patient.user:
        data.patient_first_name = patient.user.first_name
        data.patient_last_name = patient.user.last_name
    return data


def create_request(
    db: Session, data: DocumentRequestCreate, current_user: User
) -> DocumentRequestResponse:
    """Patient creates a request for their own file; staff can create on behalf."""
    patient = ensure_user_can_access_patient(db, current_user, data.patient_id)

    request = DocumentRequest(
        patient_id=patient.id,
        doctor_id=patient.doctor_id,
        type=data.type,
        title=data.title,
        message=data.message,
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return to_response(db, request)


def list_requests(db: Session, current_user: User) -> list[DocumentRequestResponse]:
    """List requests the current user is allowed to see."""
    if current_user.role == UserRole.PATIENT:
        profile = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not profile:
            return []
        rows = (
            db.query(DocumentRequest)
            .filter(DocumentRequest.patient_id == profile.id)
            .order_by(DocumentRequest.created_at.desc())
            .all()
        )
        return [to_response(db, r) for r in rows]

    doctor_id = _patient_scope(db, current_user)
    query = db.query(DocumentRequest)
    if doctor_id is not None:
        query = query.filter(DocumentRequest.doctor_id == doctor_id)
    rows = query.order_by(DocumentRequest.created_at.desc()).all()
    return [to_response(db, r) for r in rows]


def get_request(
    db: Session, request_id: int, current_user: User
) -> DocumentRequestResponse:
    request = db.get(DocumentRequest, request_id)
    if not request:
        raise NotFoundException("Document request not found")

    if current_user.role == UserRole.ADMIN:
        return to_response(db, request)

    if current_user.role == UserRole.PATIENT:
        profile = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not profile or request.patient_id != profile.id:
            raise ForbiddenException("Access denied")
        return to_response(db, request)

    doctor_id = get_doctor_id_for_user(db, current_user)
    if doctor_id is None:
        raise ForbiddenException("Access denied")
    if request.doctor_id != doctor_id:
        raise ForbiddenException("Access denied")
    return to_response(db, request)


def update_request(
    db: Session, request_id: int, data: DocumentRequestUpdate, current_user: User
) -> DocumentRequestResponse:
    """Only staff (doctor/secretary/admin) can respond to a request."""
    if current_user.role not in (
        UserRole.ADMIN,
        UserRole.DOCTOR,
        UserRole.SECRETARY,
    ):
        raise ForbiddenException("Only staff can update document requests")

    request = db.get(DocumentRequest, request_id)
    if not request:
        raise NotFoundException("Document request not found")
    # RBAC check
    get_request(db, request_id, current_user)

    if data.status is not None and data.status not in DocumentRequestStatus:
        raise BadRequestException("Invalid status")

    if data.status is not None:
        request.status = data.status
        request.responded_by = current_user.id
    if data.response is not None:
        request.response = data.response

    db.commit()
    db.refresh(request)
    return to_response(db, request)


def delete_request(db: Session, request_id: int, current_user: User) -> None:
    """Patient can delete their own pending request; staff can delete any."""
    request = db.get(DocumentRequest, request_id)
    if not request:
        raise NotFoundException("Document request not found")
    get_request(db, request_id, current_user)

    if (
        current_user.role == UserRole.PATIENT
        and request.status != DocumentRequestStatus.PENDING
    ):
        raise ForbiddenException("Cannot delete a request that has been processed")
    db.delete(request)
    db.commit()
