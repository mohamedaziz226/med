"""Service d'authentification."""

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, TokenResponse, UserResponse
from app.core.security import verify_password, hash_password, create_access_token, create_refresh_token
from app.core.exceptions import ConflictException, UnauthorizedException
from app.core.config import settings
from app.core.rate_limit import check_rate_limit, reset_rate_limit
from app.services import two_factor_service


def register_user(db: Session, user_data: UserCreate) -> User:
    """Crée un nouvel utilisateur avec hash du mot de passe."""
    if db.query(User).filter(User.email == user_data.email).first():
        raise ConflictException("Cet email est déjà utilisé")

    user = User(
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        phone=user_data.phone,
        role=user_data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, login_data: UserLogin) -> User:
    """Vérifie email + mot de passe (facteur 1)."""
    check_rate_limit(
        f"login:{login_data.email}",
        settings.LOGIN_MAX_ATTEMPTS,
        settings.LOGIN_RATE_WINDOW_SECONDS,
    )
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email ou mot de passe incorrect")

    if not verify_password(login_data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email ou mot de passe incorrect")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Compte désactivé")

    # Authentification réussie (facteur 1) : on remet le compteur de
    # tentatives à zéro pour ne pas bloquer les connexions légitimes.
    reset_rate_limit(f"login:{login_data.email}")

    return user


def generate_tokens(user: User) -> TokenResponse:
    """Génère la paire access + refresh token."""
    access = create_access_token({"sub": str(user.id), "role": user.role.value})
    refresh = create_refresh_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        token_type="bearer",
        requires_2fa=False,
        user=UserResponse.model_validate(user),
    )


def login_user(db: Session, login_data: UserLogin) -> TokenResponse:
    """
    Connexion en deux étapes si 2FA activée :
    - Facteur 1 : email + mot de passe
    - Facteur 2 : OTP par email (endpoint /verify-2fa)
    """
    user = authenticate_user(db, login_data)
    if user.is_2fa_enabled:
        challenge = two_factor_service.initiate_2fa_login(user)
        return TokenResponse(
            access_token="",
            refresh_token="",
            token_type="bearer",
            requires_2fa=True,
            pre_auth_token=challenge["pre_auth_token"],
            message=challenge["message"],
            user=UserResponse.model_validate(user),
        )
    return generate_tokens(user)


def verify_2fa_and_login(db: Session, pre_auth_token: str, otp_code: str) -> TokenResponse:
    """Valide l'OTP (facteur 2) et émet les tokens JWT."""
    user = two_factor_service.complete_2fa_login(db, pre_auth_token, otp_code)
    return generate_tokens(user)


def refresh_access_token(db: Session, refresh_token: str) -> TokenResponse:
    """Renouvelle les tokens à partir d'un refresh token valide."""
    from app.core.security import decode_token

    payload = decode_token(refresh_token)
    if payload.get("type") != "refresh":
        raise UnauthorizedException("Refresh token invalide")

    user_id = int(payload["sub"])
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise UnauthorizedException("Utilisateur non trouvé ou inactif")
    return generate_tokens(user)
