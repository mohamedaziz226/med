"""Doctor API routes."""

from fastapi import APIRouter

from sqlalchemy.orm import joinedload

from app.api.deps import CurrentUser, DbSession, RequireAdmin, RequireDoctor
from app.core.exceptions import NotFoundException
from app.models.doctor import Doctor
from app.schemas.doctor import DoctorCreate, DoctorResponse, DoctorUpdate, DoctorWithUserResponse
from app.services import doctor_service

router = APIRouter(prefix="/doctors", tags=["doctors"])


@router.post("", response_model=DoctorResponse, status_code=201)
def create_doctor(data: DoctorCreate, db: DbSession, current_user: RequireAdmin) -> DoctorResponse:
    doctor = doctor_service.create_doctor(db, data, current_user)
    return DoctorResponse.model_validate(doctor)


@router.get("", response_model=list[DoctorWithUserResponse])
def list_doctors(db: DbSession, current_user: CurrentUser) -> list[DoctorWithUserResponse]:
    doctors = db.query(Doctor).options(joinedload(Doctor.user)).all()
    result = []
    for doc in doctors:
        u = doc.user
        result.append(
            DoctorWithUserResponse(
                id=doc.id,
                user_id=doc.user_id,
                specialty=doc.specialty,
                address=doc.address,
                city=doc.city,
                license_number=doc.license_number,
                created_at=doc.created_at,
                updated_at=doc.updated_at,
                email=u.email if u else None,
                first_name=u.first_name if u else None,
                last_name=u.last_name if u else None,
                phone=u.phone if u else None,
            )
        )
    return result


@router.get("/me", response_model=DoctorResponse)
def get_my_profile(db: DbSession, current_user: RequireDoctor) -> DoctorResponse:
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()

    if not doctor:
        raise NotFoundException("Doctor profile not found")
    return DoctorResponse.model_validate(doctor)


@router.patch("/me", response_model=DoctorResponse)
def update_my_profile(data: DoctorUpdate, db: DbSession, current_user: RequireDoctor) -> DoctorResponse:
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()

    if not doctor:
        raise NotFoundException("Doctor profile not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(doctor, field, value)
    db.commit()
    db.refresh(doctor)
    return DoctorResponse.model_validate(doctor)

