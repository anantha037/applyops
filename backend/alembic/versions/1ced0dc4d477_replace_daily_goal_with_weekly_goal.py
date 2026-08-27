"""replace daily_goal with weekly_goal

Revision ID: 1ced0dc4d477
Revises: 26770aed8b1e
Create Date: 2026-08-27 05:57:04.807649

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1ced0dc4d477'
down_revision: Union[str, Sequence[str], None] = '26770aed8b1e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Add column as nullable
    op.add_column('settings', sa.Column('weekly_goal', sa.Integer(), nullable=True))
    
    # 2. Backfill existing rows
    op.execute("UPDATE settings SET weekly_goal = daily_goal * 5")
    
    # 3. Alter to NOT NULL with a default for future inserts
    op.alter_column('settings', 'weekly_goal',
                    existing_type=sa.Integer(),
                    nullable=False,
                    server_default='25')
                    
    # 4. Drop old column
    op.drop_column('settings', 'daily_goal')


def downgrade() -> None:
    """Downgrade schema."""
    # 1. Add back old column as nullable
    op.add_column('settings', sa.Column('daily_goal', sa.Integer(), nullable=True))
    
    # 2. Backfill data
    op.execute("UPDATE settings SET daily_goal = weekly_goal / 5")
    
    # 3. Alter to NOT NULL with a default for future inserts
    op.alter_column('settings', 'daily_goal',
                    existing_type=sa.Integer(),
                    nullable=False,
                    server_default='5')
                    
    # 4. Drop new column
    op.drop_column('settings', 'weekly_goal')
