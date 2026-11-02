"""Patient business logic."""

from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.core.constants import UserRole
from app.core.exceptions import ConflictException, ForbiddenException, NotFoundException
from app.core.permissions import ensure_user_can_access_patient, get_doctor_id_for_user
from app.core.security import hash_password
from app.models.patient import Patient
from app.models.user import User
from app.schemas.patient import PatientCreate, PatientUpdate, PatientWithUserResponse


def create_patient(db: Session, data: PatientCreate, current_user: User) -> Patient:
    """Create user + patient profile."""
    if current_user.role not in (UserRole.ADMIN, UserRole.DOCTOR, UserRole.SECRETARY):
        raise ForbiddenException("Only staff can create patients")

    doctor_id = data.doctor_id
    if current_user.role == UserRole.DOCTOR:
        own_doctor_id = get_doctor_id_for_user(db, current_user)
        if own_doctor_id != doctor_id:
            raise ForbiddenException("Cannot create patient for another doctor")
    elif current_user.role == UserRole.SECRETARY:
        own_doctor_id = get_doctor_id_for_user(db, current_user)
        if own_doctor_id != doctor_id:
            raise ForbiddenException("Cannot create patient for another doctor")

    if db.query(User).filter(User.email == data.email).first():
        raise ConflictException("Email already registered")

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        phone=data.phone,
        role=UserRole.PATIENT,
    )
    db.add(user)
    db.flush()

    patient = Patient(
        user_id=user.id,
        doctor_id=doctor_id,
        date_of_birth=data.date_of_birth,
        blood_type=data.blood_type,
        allergies=data.allergies,
        medical_history=data.medical_history,
        emergency_contact_name=data.emergency_contact_name,
        emergency_contact_phone=data.emergency_contact_phone,
        social_security_number=data.social_security_number,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


def get_patient(db: Session, patient_id: int, current_user: User) -> Patient:
    """Get patient with permission check."""
    return ensure_user_can_access_patient(db, current_user, patient_id)


def get_patients_by_doctor(db: Session, doctor_id: int, current_user: User) -> list[Patient]:
    """List patients for a doctor."""
    if current_user.role == UserRole.DOCTOR:
        own = get_doctor_id_for_user(db, current_user)
        if own != doctor_id:
            raise ForbiddenException()
    elif current_user.role == UserRole.SECRETARY:
        own = get_doctor_id_for_user(db, current_user)
        if own != doctor_id:
            raise ForbiddenException()
    elif current_user.role not in (UserRole.ADMIN,):
        raise ForbiddenException()

    return (
        db.query(Patient)
        .options(joinedload(Patient.user))
        .filter(Patient.doctor_id == doctor_id)
        .order_by(Patient.id.desc())
        .all()
    )


def search_patients(db: Session, query: str, doctor_id: int, current_user: User) -> list[Patient]:
    """Search patients by name, email, or phone."""
    get_patients_by_doctor(db, doctor_id, current_user)
    pattern = f"%{query}%"
    return (
        db.query(Patient)
        .join(User)
        .options(joinedload(Patient.user))
        .filter(
            Patient.doctor_id == doctor_id,
            or_(
                User.first_name.ilike(pattern),
                User.last_name.ilike(pattern),
                User.email.ilike(pattern),
                User.phone.ilike(pattern),
            ),
        )
        .all()
    )


def update_patient(db: Session, patient_id: int, data: PatientUpdate, current_user: User) -> Patient:
    """Update patient profile."""
    patient = ensure_user_can_access_patient(db, current_user, patient_id)
    update_data = data.model_dump(exclude_unset=True)

    user_fields = {"first_name", "last_name", "phone"}
    for field in list(update_data.keys()):
        if field in user_fields and patient.user:
            setattr(patient.user, field, update_data.pop(field))

    for field, value in update_data.items():
        setattr(patient, field, value)

    db.commit()
    db.refresh(patient)
    return patient


def delete_patient(db: Session, patient_id: int, current_user: User) -> None:
    """Soft-delete by deactivating user account."""
    if current_user.role not in (UserRole.ADMIN, UserRole.DOCTOR, UserRole.SECRETARY):
        raise ForbiddenException()
    patient = ensure_user_can_access_patient(db, current_user, patient_id)
    if patient.user:
        patient.user.is_active = False
    db.commit()


def to_patient_with_user(patient: Patient) -> PatientWithUserResponse:
    """Build enriched response schema."""
    return PatientWithUserResponse(
        id=patient.id,
        user_id=patient.user_id,
        doctor_id=patient.doctor_id,
        date_of_birth=patient.date_of_birth,
        blood_type=patient.blood_type,
        allergies=patient.allergies,
        medical_history=patient.medical_history,
        emergency_contact_name=patient.emergency_contact_name,
        emergency_contact_phone=patient.emergency_contact_phone,
        social_security_number=patient.social_security_number,
        created_at=patient.created_at,
        updated_at=patient.updated_at,
        email=patient.user.email if patient.user else None,
        first_name=patient.user.first_name if patient.user else None,
        last_name=patient.user.last_name if patient.user else None,
        phone=patient.user.phone if patient.user else None,
    )
