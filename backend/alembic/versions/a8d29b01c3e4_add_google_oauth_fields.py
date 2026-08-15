"""add google oauth fields

Revision ID: a8d29b01c3e4
Revises: 1268ec569d5d
Create Date: 2026-08-15 19:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a8d29b01c3e4'
down_revision: Union[str, Sequence[str], None] = '1268ec569d5d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    Idempotent: skips ADD COLUMN / CREATE INDEX if already exists in DB.
    """
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_cols = {col['name'] for col in inspector.get_columns('users')}

    if 'google_id' not in existing_cols:
        op.add_column('users', sa.Column('google_id', sa.String(length=255), nullable=True))
        op.create_index(op.f('ix_users_google_id'), 'users', ['google_id'], unique=True, if_not_exists=True)

    if 'auth_provider' not in existing_cols:
        op.add_column('users', sa.Column('auth_provider', sa.String(length=50), nullable=False, server_default='local'))


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_cols = {col['name'] for col in inspector.get_columns('users')}

    if 'auth_provider' in existing_cols:
        op.drop_column('users', 'auth_provider')
    if 'google_id' in existing_cols:
        op.drop_index(op.f('ix_users_google_id'), table_name='users', if_exists=True)
        op.drop_column('users', 'google_id')
