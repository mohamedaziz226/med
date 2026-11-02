"""ORM models package — import all models for Alembic autogenerate."""
"""ORM models package — import all models for Alembic autogenerate."""

from app.models.appointment import Appointment
from app.models.availability import DoctorAvailability
from app.models.blocked_slot import DoctorBlockedSlot
from app.models.chatbot_log import ChatbotLog
from app.models.doctor import Doctor
from app.models.document_request import DocumentRequest
from app.models.document import Document
from app.models.message import Message
from app.models.notification import Notification
from app.models.patient import Patient
from app.models.payment import Payment
from app.models.secretary import Secretary
from app.models.user import User

__all__ = [
    "User",
    "Doctor",
    "Secretary",
    "Patient",
    "Appointment",
    "Document",
    "DocumentRequest",
    "Payment",
    "Message",
    "ChatbotLog",
    "Notification",
    "DoctorAvailability",
    "DoctorBlockedSlot",
]
