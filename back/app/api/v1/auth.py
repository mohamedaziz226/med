"""Authentication API routes."""

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.user import (
    Disable2FARequest,
    Enable2FARequest,
    LoginRequest,
    RefreshRequest,
    Resend2FARequest,
    TokenResponse,
    TwoFAStatusResponse,
    UserCreate,
    UserResponse,
    Verify2FARequest,
)
from app.services import auth_service, two_factor_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=201)
def register(data: UserCreate, db: DbSession) -> UserResponse:
    """Inscription — mot de passe hashé bcrypt, pas de 2FA par défaut."""
    user = auth_service.register_user(db, data)
    return UserResponse.model_validate(user)


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: DbSession) -> TokenResponse:
    """
    Connexion facteur 1 (email + mot de passe).
    Si 2FA activée : renvoie requires_2fa=true + pre_auth_token, puis appeler POST /verify-2fa.
    """
    return auth_service.login_user(db, data)


@router.post("/verify-2fa", response_model=TokenResponse)
def verify_2fa(data: Verify2FARequest, db: DbSession) -> TokenResponse:
    """Connexion facteur 2 — valide l'OTP reçu par email."""
    return auth_service.verify_2fa_and_login(db, data.pre_auth_token, data.otp_code)


@router.post("/2fa/resend", response_model=dict)
def resend_2fa_code(data: Resend2FARequest, db: DbSession) -> dict:
    """Renvoie un nouveau code OTP pendant le flux de connexion."""
    return two_factor_service.resend_otp(db, data.pre_auth_token)


@router.post("/2fa/enable", response_model=TwoFAStatusResponse)
def enable_2fa(data: Enable2FARequest, db: DbSession, current_user: CurrentUser) -> TwoFAStatusResponse:
    """Active la double authentification par OTP email."""
    result = two_factor_service.enable_2fa(db, current_user, data.password)
    return TwoFAStatusResponse(**result)


@router.post("/2fa/disable/request", response_model=dict)
def request_disable_2fa(data: Enable2FARequest, db: DbSession, current_user: CurrentUser) -> dict:
    """Envoie un OTP par email pour confirmer la désactivation de la 2FA."""
    return two_factor_service.request_disable_otp(db, current_user, data.password)


@router.post("/2fa/disable", response_model=TwoFAStatusResponse)
def disable_2fa(data: Disable2FARequest, db: DbSession, current_user: CurrentUser) -> TwoFAStatusResponse:
    """Désactive la 2FA (mot de passe + OTP requis)."""
    result = two_factor_service.disable_2fa(db, current_user, data.password, data.otp_code)
    return TwoFAStatusResponse(**result)


@router.post("/refresh", response_model=TokenResponse)
def refresh(data: RefreshRequest, db: DbSession) -> TokenResponse:
    """Renouvelle les tokens JWT."""
    return auth_service.refresh_access_token(db, data.refresh_token)


@router.get("/me", response_model=UserResponse)
def me(current_user: CurrentUser) -> UserResponse:
    """Profil de l'utilisateur connecté."""
    return UserResponse.model_validate(current_user)
