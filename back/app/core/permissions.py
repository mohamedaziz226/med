"""Permission helpers and role-based access utilities."""

from sqlalchemy.orm import Session

from app.core.constants import UserRole
from app.core.exceptions import ForbiddenException, NotFoundException
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.secretary import Secretary
from app.models.user import User


def require_role(user: User, *roles: UserRole) -> None:
    """Raise ForbiddenException if user role is not in allowed roles."""
    if user.role not in roles:
        raise ForbiddenException("Insufficient permissions for this action")


def get_doctor_id_for_user(db: Session, user: User) -> int | None:
    """Return doctor_id associated with a doctor or secretary user."""
    if user.role == UserRole.DOCTOR:
        doctor = db.query(Doctor).filter(Doctor.user_id == user.id).first()
        return doctor.id if doctor else None
    if user.role == UserRole.SECRETARY:
        secretary = db.query(Secretary).filter(Secretary.user_id == user.id).first()
        return secretary.doctor_id if secretary else None
    return None


def ensure_patient_belongs_to_doctor(db: Session, patient_id: int, doctor_id: int) -> Patient:
    """Verify patient belongs to the given doctor."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise NotFoundException("Patient not found")
    if patient.doctor_id != doctor_id:
        raise ForbiddenException("Patient does not belong to your practice")
    return patient


def ensure_user_can_access_patient(db: Session, user: User, patient_id: int) -> Patient:
    """Check RBAC scope for patient access."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise NotFoundException("Patient not found")

    if user.role == UserRole.ADMIN:
        return patient
    if user.role == UserRole.PATIENT:
        if patient.user_id != user.id:
            raise ForbiddenException("Access denied")
        return patient

    doctor_id = get_doctor_id_for_user(db, user)
    if doctor_id is None or patient.doctor_id != doctor_id:
        raise ForbiddenException("Access denied")
    return patient
