"""Create document_requests table (patient requests to secretary/doctor).

Revision ID: 005_add_document_requests
Revises: 004_add_calendar_models
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "005_add_document_requests"
down_revision: Union[str, None] = "004_add_calendar_models"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_DOCUMENT_TYPES = [
    "irm",
    "scanner",
    "radiography",
    "biology",
    "prescription",
    "report",
    "other",
]
_REQUEST_STATUSES = ["pending", "validated", "rejected"]


def upgrade() -> None:
    op.create_table(
        "document_requests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "patient_id",
            sa.Integer(),
            sa.ForeignKey("patients.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "doctor_id",
            sa.Integer(),
            sa.ForeignKey("doctors.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "type",
            sa.Enum(*_DOCUMENT_TYPES, name="document_type", create_type=False),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.Enum(*_REQUEST_STATUSES, name="document_request_status"),
            nullable=False,
            server_default=sa.text("'pending'"),
        ),
        sa.Column("response", sa.Text(), nullable=True),
        sa.Column(
            "responded_by",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_document_requests_patient_id", "document_requests", ["patient_id"]
    )
    op.create_index(
        "ix_document_requests_doctor_id", "document_requests", ["doctor_id"]
    )


def downgrade() -> None:
    op.drop_table("document_requests")
    sa.Enum(name="document_request_status").drop(op.get_bind(), checkfirst=True)