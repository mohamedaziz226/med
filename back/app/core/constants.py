"""Application-wide enumerations."""

import enum


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    DOCTOR = "doctor"
    SECRETARY = "secretary"
    PATIENT = "patient"


class AppointmentStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    REJECTED = "rejected"
    COMPLETED = "completed"
    NO_SHOW = "no_show"


class DocumentType(str, enum.Enum):
    IRM = "irm"
    SCANNER = "scanner"
    RADIOGRAPHY = "radiography"
    BIOLOGY = "biology"
    PRESCRIPTION = "prescription"
    REPORT = "report"
    OTHER = "other"


class DocumentStatus(str, enum.Enum):
    PENDING = "pending"
    VALIDATED = "validated"
    REJECTED = "rejected"


class NotificationType(str, enum.Enum):
    APPOINTMENT_REMINDER = "appointment_reminder"
    DEBT_REMINDER = "debt_reminder"
    DOCUMENT_READY = "document_ready"
    DOCUMENT_REJECTED = "document_rejected"
    MESSAGE = "message"
    SYSTEM = "system"
    APPOINTMENT_REQUESTED = "appointment_requested"
    APPOINTMENT_CONFIRMED = "appointment_confirmed"
    APPOINTMENT_REJECTED = "appointment_rejected"
    APPOINTMENT_RESCHEDULED = "appointment_rescheduled"


class PaymentStatus(str, enum.Enum):
    PAID = "paid"
    PENDING = "pending"
    OVERDUE = "overdue"
    PARTIAL = "partial"


class MessageType(str, enum.Enum):
    TEXT = "text"
    SYSTEM = "system"


class DocumentRequestStatus(str, enum.Enum):
    PENDING = "pending"
    VALIDATED = "validated"
    REJECTED = "rejected"
