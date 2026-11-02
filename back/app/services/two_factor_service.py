"""Two-factor authentication via email OTP."""

import hashlib
import logging
import secrets
from datetime import datetime, timezone

import redis
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import BadRequestException, UnauthorizedException
from app.core.security import create_pre_auth_token, decode_token, verify_password
from app.models.user import User
from app.services.notification_service import send_email
from app.utils.email_templates import otp_email_body

logger = logging.getLogger(__name__)

_redis_client: redis.Redis | None = None
_otp_memory_store: dict[str, tuple[str, datetime]] = {}


def _get_redis() -> redis.Redis | None:
    global _redis_client
    if _redis_client is None:
        try:
            _redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
            _redis_client.ping()
        except Exception as exc:
            logger.warning("Redis unavailable for 2FA, using in-memory fallback: %s", exc)
            _redis_client = None
    return _redis_client


def _otp_key(user_id: int) -> str:
    return f"2fa:otp:{user_id}"


def _hash_otp(code: str) -> str:
    return hashlib.sha256(f"{code}:{settings.SECRET_KEY}".encode()).hexdigest()


def generate_otp() -> str:
    """Generate a numeric OTP of configured length."""
    upper = 10**settings.OTP_LENGTH
    return str(secrets.randbelow(upper)).zfill(settings.OTP_LENGTH)


def store_otp(user_id: int, code: str) -> None:
    """Store hashed OTP with TTL."""
    ttl = settings.OTP_EXPIRE_MINUTES * 60
    hashed = _hash_otp(code)
    client = _get_redis()
    if client:
        client.setex(_otp_key(user_id), ttl, hashed)
        return
    expires = datetime.now(timezone.utc).timestamp() + ttl
    _otp_memory_store[_otp_key(user_id)] = (hashed, datetime.fromtimestamp(expires, tz=timezone.utc))


def _get_stored_otp_hash(user_id: int) -> str | None:
    client = _get_redis()
    if client:
        return client.get(_otp_key(user_id))
    entry = _otp_memory_store.get(_otp_key(user_id))
    if not entry:
        return None
    hashed, expires_at = entry
    if datetime.now(timezone.utc) > expires_at:
        del _otp_memory_store[_otp_key(user_id)]
        return None
    return hashed


def clear_otp(user_id: int) -> None:
    client = _get_redis()
    if client:
        client.delete(_otp_key(user_id))
    _otp_memory_store.pop(_otp_key(user_id), None)


def verify_otp(user_id: int, code: str) -> bool:
    """Verify OTP and invalidate on success."""
    stored = _get_stored_otp_hash(user_id)
    if not stored:
        return False
    if stored != _hash_otp(code):
        return False
    clear_otp(user_id)
    return True


def send_otp_to_user(user: User) -> None:
    """Generate and email an OTP to the user."""
    code = generate_otp()
    store_otp(user.id, code)
    body = otp_email_body(user.first_name, code, settings.OTP_EXPIRE_MINUTES)
    sent = send_email(user.email, "Code de vérification — MedSecretariat", body, html=True)
    if not sent:
        raise BadRequestException("Impossible d'envoyer le code de vérification par email")


def decode_pre_auth_token(token: str) -> int:
    """Validate pre-auth token and return user_id."""
    payload = decode_token(token)
    if payload.get("type") != "pre_auth":
        raise UnauthorizedException("Token de pré-authentification invalide")
    return int(payload["sub"])


def initiate_2fa_login(user: User) -> dict:
    """Send OTP and return pre-auth token for step 2."""
    send_otp_to_user(user)
    return {
        "requires_2fa": True,
        "pre_auth_token": create_pre_auth_token(user.id),
        "message": "Un code de vérification a été envoyé à votre adresse email",
    }


def complete_2fa_login(db: Session, pre_auth_token: str, otp_code: str) -> User:
    """Verify OTP after password step and return authenticated user."""
    user_id = decode_pre_auth_token(pre_auth_token)
    if not verify_otp(user_id, otp_code):
        raise UnauthorizedException("Code de vérification invalide ou expiré")

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise UnauthorizedException("Utilisateur non trouvé ou inactif")
    if not user.is_2fa_enabled:
        raise BadRequestException("La double authentification n'est pas activée pour ce compte")
    return user


def enable_2fa(db: Session, user: User, password: str) -> dict:
    """Enable 2FA after password confirmation."""
    if not verify_password(password, user.password_hash):
        raise UnauthorizedException("Mot de passe incorrect")
    if user.is_2fa_enabled:
        raise BadRequestException("La double authentification est déjà activée")

    user.is_2fa_enabled = True
    db.commit()
    send_otp_to_user(user)
    return {
        "is_2fa_enabled": True,
        "message": "Double authentification activée. Un code de test a été envoyé par email.",
    }


def request_disable_otp(db: Session, user: User, password: str) -> dict:
    """Send OTP required to disable 2FA."""
    if not user.is_2fa_enabled:
        raise BadRequestException("La double authentification n'est pas activée")
    if not verify_password(password, user.password_hash):
        raise UnauthorizedException("Mot de passe incorrect")
    send_otp_to_user(user)
    return {"message": "Un code de vérification a été envoyé pour confirmer la désactivation"}


def disable_2fa(db: Session, user: User, password: str, otp_code: str) -> dict:
    """Disable 2FA after password + OTP confirmation."""
    if not user.is_2fa_enabled:
        raise BadRequestException("La double authentification n'est pas activée")
    if not verify_password(password, user.password_hash):
        raise UnauthorizedException("Mot de passe incorrect")
    if not verify_otp(user.id, otp_code):
        raise UnauthorizedException("Code de vérification invalide ou expiré")

    user.is_2fa_enabled = False
    db.commit()
    return {"is_2fa_enabled": False, "message": "Double authentification désactivée"}


def resend_otp(db: Session, pre_auth_token: str) -> dict:
    """Resend OTP during login flow."""
    user_id = decode_pre_auth_token(pre_auth_token)
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active or not user.is_2fa_enabled:
        raise UnauthorizedException("Session de vérification invalide")
    send_otp_to_user(user)
    return {"message": "Un nouveau code a été envoyé à votre adresse email"}
