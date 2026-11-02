"""Secretary API routes."""

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, DbSession, RequireStaff
from app.core.constants import UserRole
from app.core.exceptions import NotFoundException
from app.core.permissions import get_doctor_id_for_user
from app.models.secretary import Secretary
from app.schemas.secretary import SecretaryCreate, SecretaryResponse, SecretaryWithUserResponse
from app.services import secretary_service

router = APIRouter(prefix="/secretaries", tags=["secretaries"])


@router.post("", response_model=SecretaryResponse, status_code=201)
def create_secretary(data: SecretaryCreate, db: DbSession, current_user: CurrentUser) -> SecretaryResponse:
    secretary = secretary_service.create_secretary(db, data, current_user)
    return SecretaryResponse.model_validate(secretary)


@router.get("", response_model=list[SecretaryWithUserResponse])
def list_secretaries(
    db: DbSession,
    current_user: CurrentUser,
    doctor_id: int | None = Query(None),
) -> list[SecretaryWithUserResponse]:
    if doctor_id:
        secretaries = secretary_service.get_secretaries_by_doctor(db, doctor_id)
    elif current_user.role == UserRole.DOCTOR:
        own_doc_id = get_doctor_id_for_user(db, current_user)
        secretaries = secretary_service.get_secretaries_by_doctor(db, own_doc_id) if own_doc_id else []
    else:
        secretaries = secretary_service.get_all_secretaries(db)
    return [secretary_service.to_secretary_with_user(s) for s in secretaries]


@router.get("/me/doctor-id")
def get_assigned_doctor_id(
    db: DbSession,
    current_user: CurrentUser,
) -> dict[str, int]:
    """Return the doctor_id and doctor user_id assigned to the current secretary."""
    secretary = db.query(Secretary).filter(Secretary.user_id == current_user.id).first()
    if not secretary:
        raise NotFoundException("Secretary profile not found")
    return {
        "doctor_id": secretary.doctor_id,
        "doctor_user_id": secretary.doctor.user_id,
    }

