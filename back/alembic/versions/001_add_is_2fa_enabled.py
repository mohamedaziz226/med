"""Add is_2fa_enabled to users table."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "001_add_is_2fa_enabled"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("is_2fa_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.alter_column("users", "is_2fa_enabled", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "is_2fa_enabled")
