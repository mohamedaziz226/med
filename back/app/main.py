"""MedSecretariat FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import (
    admin,
    appointments,
    auth,
    calendar,
    chatbot,
    doctors,
    documents,
    messages,
    notifications,
    patients,
    payments,
    secretaries,
    webhooks,
)
from app.api.websocket import notifications as ws_notifications
from app.core.config import settings
from app.database.base import Base
from app.database.session import engine
from app.models import (  # noqa: F401 — register models with Base
    Appointment,
    ChatbotLog,
    Doctor,
    DoctorAvailability,
    DoctorBlockedSlot,
    Document,
    Message,
    Notification,
    Patient,
    Payment,
    Secretary,
    User,
)
from app.services.storage_service import ensure_buckets_exist
from app.tasks.scheduler import init_scheduler, shutdown_scheduler

logging.basicConfig(level=logging.INFO if settings.DEBUG else logging.WARNING)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle."""
    logger.info("Starting %s v%s", settings.APP_NAME, settings.APP_VERSION)
    Base.metadata.create_all(bind=engine)
    ensure_buckets_exist()
    init_scheduler()
    yield
    shutdown_scheduler()
    logger.info("Shutdown complete")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_prefix = settings.API_V1_PREFIX
app.include_router(auth.router, prefix=api_prefix)
app.include_router(admin.router, prefix=api_prefix)
app.include_router(doctors.router, prefix=api_prefix)
app.include_router(secretaries.router, prefix=api_prefix)
app.include_router(patients.router, prefix=api_prefix)
app.include_router(appointments.router, prefix=api_prefix)
app.include_router(calendar.router, prefix=api_prefix)
app.include_router(documents.router, prefix=api_prefix)
app.include_router(notifications.router, prefix=api_prefix)
app.include_router(payments.router, prefix=api_prefix)
app.include_router(messages.router, prefix=api_prefix)
app.include_router(chatbot.router, prefix=api_prefix)
app.include_router(webhooks.router, prefix=api_prefix)
app.include_router(ws_notifications.router)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "healthy", "app": settings.APP_NAME, "version": settings.APP_VERSION}
