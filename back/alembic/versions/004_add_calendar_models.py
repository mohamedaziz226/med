"""Add calendar models: doctor_availability, doctor_blocked_slots, proposed_at.

Revision ID: 004_add_calendar_models
Revises: 003_add_debt_reminder_notification_type
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "004_add_calendar_models"
down_revision: Union[str, None] = "003_add_debt_reminder_notification_type"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── doctor_availability ────────────────────────────────────────────────────
    op.create_table(
        "doctor_availability",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "doctor_id",
            sa.Integer(),
            sa.ForeignKey("doctors.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("weekday", sa.Integer(), nullable=True),
        sa.Column("date", sa.Date(), nullable=True),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint(
            "(weekday IS NULL) <> (date IS NULL)",
            name="ck_availability_exactly_one_mode",
        ),
        sa.CheckConstraint(
            "start_time < end_time",
            name="ck_availability_start_before_end",
        ),
    )
    op.create_index("ix_doctor_availability_doctor_id", "doctor_availability", ["doctor_id"])
    op.create_index(
        "ix_availability_doctor_weekday", "doctor_availability", ["doctor_id", "weekday"]
    )
    op.create_index("ix_availability_doctor_date", "doctor_availability", ["doctor_id", "date"])

    # ── doctor_blocked_slots ───────────────────────────────────────────────────
    op.create_table(
        "doctor_blocked_slots",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "doctor_id",
            sa.Integer(),
            sa.ForeignKey("doctors.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reason", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("end_time > start_time", name="ck_blocked_end_after_start"),
    )
    op.create_index("ix_doctor_blocked_slots_doctor_id", "doctor_blocked_slots", ["doctor_id"])
    op.create_index("ix_doctor_blocked_slots_start_time", "doctor_blocked_slots", ["start_time"])

    # ── appointments.proposed_at ───────────────────────────────────────────────
    op.add_column("appointments", sa.Column("proposed_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("appointments", "proposed_at")
    op.drop_table("doctor_blocked_slots")
    op.drop_table("doctor_availability")