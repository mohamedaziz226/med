"""PDF invoice generation service."""

import logging
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from uuid import uuid4

from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.patient import Patient
from app.models.payment import Payment
from app.services.storage_service import get_presigned_url, upload_bytes

logger = logging.getLogger(__name__)

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"
_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html", "xml"]),
)


def generate_invoice_pdf(
    invoice_number: str,
    patient_name: str,
    amount: Decimal,
    amount_paid: Decimal,
    due_date: str,
    description: str | None,
) -> bytes:
    """Render invoice HTML template to PDF bytes via WeasyPrint."""
    template = _env.get_template("invoice.html")
    html_content = template.render(
        invoice_number=invoice_number,
        patient_name=patient_name,
        amount=f"{amount:.2f}",
        amount_paid=f"{amount_paid:.2f}",
        balance=f"{(amount - amount_paid):.2f}",
        due_date=due_date,
        description=description or "Consultation médicale",
        generated_at=datetime.now(timezone.utc).strftime("%d/%m/%Y"),
    )
    try:
        from weasyprint import HTML

        return HTML(string=html_content).write_pdf()
    except Exception as exc:
        logger.warning("WeasyPrint unavailable, returning HTML as fallback: %s", exc)
        return html_content.encode("utf-8")


def generate_and_store_invoice(db: Session, payment: Payment) -> str:
    """Generate invoice PDF, upload to MinIO, update payment record."""
    patient = db.query(Patient).filter(Patient.id == payment.patient_id).first()
    if not patient or not patient.user:
        raise ValueError("Patient not found for invoice generation")

    patient_name = f"{patient.user.first_name} {patient.user.last_name}"
    invoice_number = payment.invoice_number or f"INV-{datetime.now(timezone.utc):%Y%m%d}-{uuid4().hex[:8].upper()}"

    pdf_bytes = generate_invoice_pdf(
        invoice_number=invoice_number,
        patient_name=patient_name,
        amount=payment.amount,
        amount_paid=payment.amount_paid,
        due_date=payment.due_date.strftime("%d/%m/%Y"),
        description=payment.description,
    )

    object_key = f"invoices/{patient.doctor_id}/{patient.id}/{invoice_number}.pdf"
    content_type = "application/pdf" if pdf_bytes[:4] == b"%PDF" else "text/html"
    upload_bytes(settings.MINIO_BUCKET_INVOICES, object_key, pdf_bytes, content_type)

    payment.invoice_number = invoice_number
    payment.invoice_pdf_key = object_key
    db.commit()
    db.refresh(payment)
    return object_key


def get_invoice_presigned_url(payment: Payment, expiry: int = 86400) -> str | None:
    """Return 24h presigned URL for invoice PDF."""
    if not payment.invoice_pdf_key:
        return None
    return get_presigned_url(settings.MINIO_BUCKET_INVOICES, payment.invoice_pdf_key, expiry=expiry)
