"""add_unique_contact_email_index

Revision ID: 9c84c6925363
Revises: 13f3a4ad9402
Create Date: 2026-08-26 06:57:40.842762

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9c84c6925363'
down_revision: Union[str, Sequence[str], None] = '13f3a4ad9402'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("CREATE UNIQUE INDEX uq_contact_email ON contacts (user_id, LOWER(email));")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP INDEX uq_contact_email;")
