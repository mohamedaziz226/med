"""Patient API routes."""

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, DbSession, RequireStaff
from app.schemas.patient import PatientCreate, PatientResponse, PatientUpdate, PatientWithUserResponse
from app.services import patient_service

router = APIRouter(prefix="/patients", tags=["patients"])


@router.post("", response_model=PatientResponse, status_code=201)
def create_patient(data: PatientCreate, db: DbSession, current_user: RequireStaff) -> PatientResponse:
    patient = patient_service.create_patient(db, data, current_user)
    return PatientResponse.model_validate(patient)


@router.get("/me", response_model=PatientWithUserResponse)
def get_my_patient_profile(db: DbSession, current_user: CurrentUser) -> PatientWithUserResponse:
    from app.core.exceptions import NotFoundException
    from app.models.patient import Patient

    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise NotFoundException("Patient profile not found")
    return patient_service.to_patient_with_user(patient)


@router.get("/{patient_id}", response_model=PatientWithUserResponse)
def get_patient(patient_id: int, db: DbSession, current_user: CurrentUser) -> PatientWithUserResponse:
    patient = patient_service.get_patient(db, patient_id, current_user)
    return patient_service.to_patient_with_user(patient)



@router.get("", response_model=list[PatientWithUserResponse])
def list_patients(
    db: DbSession,
    current_user: RequireStaff,
    doctor_id: int = Query(...),
    search: str | None = Query(None),
) -> list[PatientWithUserResponse]:
    if search:
        patients = patient_service.search_patients(db, search, doctor_id, current_user)
    else:
        patients = patient_service.get_patients_by_doctor(db, doctor_id, current_user)
    return [patient_service.to_patient_with_user(p) for p in patients]


@router.patch("/{patient_id}", response_model=PatientResponse)
def update_patient(
    patient_id: int,
    data: PatientUpdate,
    db: DbSession,
    current_user: CurrentUser,
) -> PatientResponse:
    patient = patient_service.update_patient(db, patient_id, data, current_user)
    return PatientResponse.model_validate(patient)


@router.delete("/{patient_id}", status_code=204)
def delete_patient(patient_id: int, db: DbSession, current_user: RequireStaff) -> None:
    patient_service.delete_patient(db, patient_id, current_user)
