"""Add debt_reminder to notification_type enum.

Revision ID: 003_add_debt_reminder_notification_type
Revises: 002_add_notifications
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003_add_debt_reminder_notification_type"
down_revision: Union[str, None] = "002_add_notifications"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # PostgreSQL 12+ : ADD VALUE peut être exécuté dans une transaction.
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'debt_reminder'")


def downgrade() -> None:
    # PostgreSQL ne permet pas de RETIRER une valeur d'un type enum :
    # on ne fait rien (le code applicatif n'utilisera plus cette valeur).
    pass