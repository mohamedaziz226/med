"""Payment API routes."""

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, DbSession, RequireStaff
from app.schemas.payment import InvoiceGenerateRequest, PaymentCreate, PaymentResponse, PaymentUpdate
from app.services import payment_service

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("", response_model=PaymentResponse, status_code=201)
def create_payment(data: PaymentCreate, db: DbSession, current_user: RequireStaff) -> PaymentResponse:
    payment = payment_service.create_payment(db, data, current_user)
    return payment_service.to_payment_response(payment)


@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment(payment_id: int, db: DbSession, current_user: CurrentUser) -> PaymentResponse:
    payment = payment_service.get_payment(db, payment_id, current_user)
    return payment_service.to_payment_response(payment)


@router.get("", response_model=list[PaymentResponse])
def list_payments(
    db: DbSession,
    current_user: CurrentUser,
    patient_id: int = Query(...),
) -> list[PaymentResponse]:
    payments = payment_service.get_payments_by_patient(db, patient_id, current_user)
    return [payment_service.to_payment_response(p) for p in payments]


@router.patch("/{payment_id}", response_model=PaymentResponse)
def update_payment(
    payment_id: int,
    data: PaymentUpdate,
    db: DbSession,
    current_user: RequireStaff,
) -> PaymentResponse:
    payment = payment_service.update_payment(db, payment_id, data, current_user)
    return payment_service.to_payment_response(payment)


@router.delete("/{payment_id}", status_code=204)
def delete_payment(payment_id: int, db: DbSession, current_user: RequireStaff) -> None:
    payment_service.delete_payment(db, payment_id, current_user)


@router.post("/{payment_id}/remind", response_model=PaymentResponse)
def send_payment_reminder(
    payment_id: int,
    db: DbSession,
    current_user: RequireStaff,
    note: str | None = None,
) -> PaymentResponse:
    """Send a payment reminder (email + SMS) for a specific payment."""
    payment = payment_service.send_reminder(db, payment_id, current_user, note=note)
    return payment_service.to_payment_response(payment)


@router.post("/invoices/generate", response_model=PaymentResponse)
def generate_invoice(data: InvoiceGenerateRequest, db: DbSession, current_user: RequireStaff) -> PaymentResponse:
    return payment_service.generate_invoice(db, data.payment_id, current_user)
