"""add_manual_last_contact_date

Revision ID: 13f3a4ad9402
Revises: 77db924445d2
Create Date: 2026-08-25 23:53:06.582540

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '13f3a4ad9402'
down_revision: Union[str, Sequence[str], None] = '77db924445d2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('contacts', sa.Column('manual_last_contact_date', sa.Date(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('contacts', 'manual_last_contact_date')
