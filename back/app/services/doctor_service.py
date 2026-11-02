"""Doctor business logic."""

from uuid import uuid4

from sqlalchemy.orm import Session

from app.core.constants import UserRole
from app.core.exceptions import ConflictException, ForbiddenException
from app.core.security import hash_password
from app.models.doctor import Doctor
from app.models.user import User
from app.schemas.doctor import DoctorCreate


def _generate_license_number() -> str:
    """Generate a unique fallback license number when none is provided."""
    return f"MED-{uuid4().hex[:8].upper()}"


def create_doctor(db: Session, data: DoctorCreate, current_user: User) -> Doctor:
    """Create user + doctor profile (admin only)."""
    if current_user.role != UserRole.ADMIN:
        raise ForbiddenException("Only admin can create doctors")

    if db.query(User).filter(User.email == data.email).first():
        raise ConflictException("Email already registered")

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        phone=data.phone,
        role=UserRole.DOCTOR,
    )
    db.add(user)
    db.flush()

    doctor = Doctor(
        user_id=user.id,
        specialty=data.specialty,
        address=data.address,
        city=data.city,
        license_number=data.license_number or _generate_license_number(),
    )
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    return doctor