from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuration centralisee via Pydantic Settings v2."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    APP_NAME: str = "MedSecretariat"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"
    FRONTEND_URL: str = "http://localhost:5173"

    DATABASE_URL: str = "postgresql+psycopg2://meduser:medpass@postgres:5432/medsecretariat"

    SECRET_KEY: str = "change-me-in-production-use-a-long-random-secret"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    PRE_AUTH_TOKEN_EXPIRE_MINUTES: int = 10
    OTP_EXPIRE_MINUTES: int = 10
    OTP_LENGTH: int = 6

    MINIO_ENDPOINT: str = "minio:9000"
    # Endpoint MinIO joignable depuis le NAVIGATEUR (utilisé pour les URLs pré-signées).
    # Vide = utiliser MINIO_ENDPOINT. En local Docker : localhost:9000 (port publié).
    MINIO_PUBLIC_ENDPOINT: str = ""
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_SECURE: bool = False
    MINIO_BUCKET_MEDICAL: str = "medical-docs"
    MINIO_BUCKET_INVOICES: str = "invoices"
    MINIO_PRESIGNED_EXPIRY_SECONDS: int = 900

    REDIS_URL: str = "redis://redis:6379/0"

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "MedSecretariat <noreply@medsecretariat.local>"
    SMTP_USE_TLS: bool = True

    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""

    N8N_WEBHOOK_URL: str = ""
    N8N_CALENDAR_WEBHOOK_PATH: str = "/appointment-sync"
    N8N_WEBHOOK_SECRET: str = ""
    # Le flag MED_N8N_ADMIN_EMAIL/MED_N8N_ADMIN_PASSWORD sont lus via le
    # conteneur n8n (docker-compose) et non exposés au backend.

    # Fuseau métier du cabinet (Africa/Tunis, UTC+1, pas d'heure d'été).
    SCHEDULER_TIMEZONE: str = "Africa/Tunis"
    # Adresse email de l'administrateur initial (utilisée par le seed_admin).
    ADMIN_EMAIL: str = "admin@med.com"
    # Les rappels (RDV J-7/J-1 et dettes) sont gérés nativement par le backend
    # via APScheduler. Passer à False si n8n prend en charge ces rappels pour
    # éviter les doublons (le code reste intact, seuls les jobs sont ignorés).
    ENABLE_BACKEND_REMINDERS: bool = True
    LOGIN_MAX_ATTEMPTS: int = 5
    LOGIN_RATE_WINDOW_SECONDS: int = 900

    # Alias rétro-compatibles (évite les divergences de nommage MinIO)
    @property
    def MINIO_MEDICAL_DOCS_BUCKET(self) -> str:
        return self.MINIO_BUCKET_MEDICAL

    @property
    def MINIO_INVOICES_BUCKET(self) -> str:
        return self.MINIO_BUCKET_INVOICES

    def validate_production_settings(self) -> None:
        """Refuse un démarrage prod avec une clé JWT par défaut."""
        if not self.DEBUG and self.SECRET_KEY.startswith("change-me"):
            raise ValueError(
                "SECRET_KEY must be set to a strong random value in production (DEBUG=false)"
            )

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def smtp_configured(self) -> bool:
        return bool(self.SMTP_HOST and self.SMTP_USER and self.SMTP_PASSWORD)

    @property
    def twilio_configured(self) -> bool:
        return bool(self.TWILIO_ACCOUNT_SID and self.TWILIO_AUTH_TOKEN and self.TWILIO_PHONE_NUMBER)


@lru_cache
def get_settings() -> Settings:
    """Singleton des settings (cache)."""
    return Settings()


settings = get_settings()