"""add_reward_grants_ledger

Adds the reward_grants table: an append-only ledger of every XP/coin/star/rating
grant, keyed by a unique idempotency_key. The unique constraint is what prevents
a double-clicked or retried submission from awarding rewards twice.

Revision ID: a1b2c3d4e5f6
Revises: 7556e8d7de9e
Create Date: 2026-09-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '7556e8d7de9e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    Idempotent: skips creation when the table already exists, matching the
    convention used by the other migrations in this project (the deployed
    Supabase schema has drifted from migration history before).
    """
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if 'reward_grants' not in existing_tables:
        op.create_table(
            'reward_grants',
            sa.Column('id', sa.Uuid(), nullable=False),
            sa.Column('user_id', sa.Uuid(), nullable=False),
            sa.Column('idempotency_key', sa.String(length=200), nullable=False),
            sa.Column('reason', sa.String(length=100), nullable=False),
            sa.Column('reference_id', sa.String(length=100), nullable=True),
            sa.Column('xp_granted', sa.Integer(), server_default='0', nullable=False),
            sa.Column('coins_granted', sa.Integer(), server_default='0', nullable=False),
            sa.Column('stars_granted', sa.Integer(), server_default='0', nullable=False),
            sa.Column('rating_delta', sa.Integer(), server_default='0', nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
        )

    existing_indexes = (
        [ix['name'] for ix in inspector.get_indexes('reward_grants')]
        if 'reward_grants' in inspector.get_table_names()
        else []
    )
    if 'ix_reward_grants_idempotency_key' not in existing_indexes:
        op.create_index(
            'ix_reward_grants_idempotency_key',
            'reward_grants',
            ['idempotency_key'],
            unique=True,
        )
    if 'ix_reward_grants_user_id' not in existing_indexes:
        op.create_index('ix_reward_grants_user_id', 'reward_grants', ['user_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_reward_grants_user_id', table_name='reward_grants')
    op.drop_index('ix_reward_grants_idempotency_key', table_name='reward_grants')
    op.drop_table('reward_grants')
