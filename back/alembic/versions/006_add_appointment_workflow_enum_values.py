"""Add missing enum values for the appointment workflow.

Les labels « workflow rendez-vous » (accepter / refuser / recaler) ont été
ajoutés aux enums Python APRÈS la création initiale de la base :
  - appointment_status.REJECTED
  - notification_type.APPOINTMENT_REQUESTED / _CONFIRMED / _REJECTED / _RESCHEDULED

``Base.metadata.create_all`` ne modifie jamais un type enum existant, ce qui
provoquait des ``DataError: invalid input value for enum ...`` (500) sur les
endpoints accept / confirm / reject / reschedule et sur le calendrier.

NB : SQLAlchemy persiste par défaut les NOMS des membres (majuscules),
d'où des labels en majuscules (la migration 003 avait utilisé la valeur
minuscule, restée inutilisée).

Revision ID: 006_appointment_enum_values
Revises: 005_add_document_requests
"""

from typing import Sequence, Union

from alembic import op

revision: str = "006_appointment_enum_values"
down_revision: Union[str, None] = "005_add_document_requests"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # PostgreSQL 12+ : ADD VALUE peut être exécuté dans une transaction.
    op.execute("ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'REJECTED'")
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'APPOINTMENT_REQUESTED'")
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'APPOINTMENT_CONFIRMED'")
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'APPOINTMENT_REJECTED'")
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'APPOINTMENT_RESCHEDULED'")


def downgrade() -> None:
    # PostgreSQL ne permet pas de RETIRER une valeur d'un type enum :
    # on ne fait rien (le code applicatif n'utilise plus ces valeurs).
    pass