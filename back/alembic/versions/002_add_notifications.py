"""Create notifications table (in-app patient notifications).

Revision ID: 002_add_notifications
Revises: 001_add_is_2fa_enabled
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002_add_notifications"
down_revision: Union[str, None] = "001_add_is_2fa_enabled"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "patient_id",
            sa.Integer(),
            sa.ForeignKey("patients.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column(
            "type",
            sa.Enum(
                "appointment_reminder",
                "document_ready",
                "document_rejected",
                "message",
                "system",
                name="notification_type",
            ),
            nullable=False,
        ),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("related_entity_id", sa.Integer(), nullable=True),
        sa.Column("related_entity_type", sa.String(length=50), nullable=True),
        sa.Column("reminder_type", sa.String(length=20), nullable=True),
        sa.Column("dedup_key", sa.String(length=255), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_index("ix_notifications_patient_id", "notifications", ["patient_id"])
    op.create_index("ix_notifications_type", "notifications", ["type"])
    op.create_index(
        "ix_notifications_patient_read", "notifications", ["patient_id", "is_read"]
    )
    # Anti-doublon : plusieurs NULL sont autorisés, une seule valeur par clé.
    op.create_unique_constraint(
        "uq_notifications_dedup_key", "notifications", ["dedup_key"]
    )


def downgrade() -> None:
    op.drop_table("notifications")
    sa.Enum(name="notification_type").drop(op.get_bind(), checkfirst=True)