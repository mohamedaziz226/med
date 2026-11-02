"""Secretary business logic."""

from sqlalchemy.orm import Session, joinedload

from app.core.constants import UserRole
from app.core.exceptions import ConflictException, ForbiddenException, NotFoundException
from app.core.permissions import get_doctor_id_for_user
from app.core.security import hash_password
from app.models.doctor import Doctor
from app.models.secretary import Secretary
from app.models.user import User
from app.schemas.secretary import SecretaryCreate, SecretaryWithUserResponse


def create_secretary(db: Session, data: SecretaryCreate, current_user: User) -> Secretary:
    """Create user + secretary profile."""
    if current_user.role not in (UserRole.ADMIN, UserRole.DOCTOR):
        raise ForbiddenException("Only admin or doctor can create secretaries")

    doctor_id = data.doctor_id
    if current_user.role == UserRole.DOCTOR:
        own_doctor_id = get_doctor_id_for_user(db, current_user)
        if own_doctor_id and own_doctor_id != doctor_id:
            doctor_id = own_doctor_id

    # Check if doctor exists
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise NotFoundException("Doctor not found")

    if db.query(User).filter(User.email == data.email).first():
        raise ConflictException("Email already registered")

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        phone=data.phone,
        role=UserRole.SECRETARY,
    )
    db.add(user)
    db.flush()

    secretary = Secretary(
        user_id=user.id,
        doctor_id=doctor_id,
    )
    db.add(secretary)
    db.commit()
    db.refresh(secretary)
    return secretary


def get_secretaries_by_doctor(db: Session, doctor_id: int) -> list[Secretary]:
    """Get secretaries for a given doctor."""
    return (
        db.query(Secretary)
        .options(joinedload(Secretary.user))
        .filter(Secretary.doctor_id == doctor_id)
        .order_by(Secretary.id.desc())
        .all()
    )


def get_all_secretaries(db: Session) -> list[Secretary]:
    """Get all secretaries across the practice."""
    return (
        db.query(Secretary)
        .options(joinedload(Secretary.user))
        .order_by(Secretary.id.desc())
        .all()
    )


def to_secretary_with_user(secretary: Secretary) -> SecretaryWithUserResponse:
    """Build enriched response schema."""
    user = secretary.user
    return SecretaryWithUserResponse(
        id=secretary.id,
        user_id=secretary.user_id,
        doctor_id=secretary.doctor_id,
        created_at=secretary.created_at,
        updated_at=secretary.updated_at,
        email=user.email if user else None,
        first_name=user.first_name if user else None,
        last_name=user.last_name if user else None,
        phone=user.phone if user else None,
    )
