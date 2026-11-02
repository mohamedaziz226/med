"""FastAPI dependency injection for auth and RBAC."""

from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.constants import UserRole
from app.core.exceptions import ForbiddenException, NotFoundException, UnauthorizedException
from app.core.security import decode_token
from app.database.dependencies import get_db
from app.models.doctor import Doctor
from app.models.secretary import Secretary
from app.models.user import User

security_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    db: Annotated[Session, Depends(get_db)],
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security_scheme)],
) -> User:
    """Decode JWT and return active user."""
    if credentials is None:
        raise UnauthorizedException()
    payload = decode_token(credentials.credentials)
    if payload.get("type") != "access":
        raise UnauthorizedException("Invalid token type")

    user_id = int(payload["sub"])
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise UnauthorizedException("User not found")
    return user


def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Ensure user account is active."""
    if not current_user.is_active:
        raise UnauthorizedException("User account is inactive")
    return current_user


def require_role(*roles: UserRole):
    """Factory returning a dependency that checks user role."""

    def _check_role(current_user: Annotated[User, Depends(get_current_active_user)]) -> User:
        if current_user.role not in roles:
            raise ForbiddenException("Insufficient permissions")
        return current_user

    return _check_role


def get_current_secretary_doctor_id(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> int:
    """Return doctor_id for the current secretary."""
    if current_user.role != UserRole.SECRETARY:
        raise ForbiddenException("Only secretaries have an assigned doctor")
    secretary = db.query(Secretary).filter(Secretary.user_id == current_user.id).first()
    if not secretary:
        raise NotFoundException("Secretary profile not found")
    return secretary.doctor_id


CurrentUser = Annotated[User, Depends(get_current_active_user)]
DbSession = Annotated[Session, Depends(get_db)]
RequireAdmin = Annotated[User, Depends(require_role(UserRole.ADMIN))]
RequireDoctor = Annotated[User, Depends(require_role(UserRole.DOCTOR))]
RequireSecretary = Annotated[User, Depends(require_role(UserRole.SECRETARY))]
RequirePatient = Annotated[User, Depends(require_role(UserRole.PATIENT))]
RequireStaff = Annotated[User, Depends(require_role(UserRole.ADMIN, UserRole.DOCTOR, UserRole.SECRETARY))]
