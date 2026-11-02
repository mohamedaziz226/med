"""Payment Pydantic schemas."""

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.core.constants import PaymentStatus


class PaymentCreate(BaseModel):
    patient_id: int
    amount: Decimal = Field(gt=0)
    due_date: date
    description: str | None = None


class PaymentUpdate(BaseModel):
    amount: Decimal | None = Field(default=None, gt=0)
    amount_paid: Decimal | None = Field(default=None, ge=0)
    status: PaymentStatus | None = None
    due_date: date | None = None
    description: str | None = None


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    amount: Decimal
    amount_paid: Decimal
    status: PaymentStatus
    due_date: date
    paid_at: datetime | None
    description: str | None
    invoice_pdf_key: str | None
    invoice_number: str | None
    reminder_sent_count: int
    last_reminder_at: datetime | None
    created_at: datetime
    updated_at: datetime
    invoice_url: str | None = None


class InvoiceGenerateRequest(BaseModel):
    payment_id: int
