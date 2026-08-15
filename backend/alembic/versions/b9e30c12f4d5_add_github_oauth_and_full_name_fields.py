"""add github oauth and full name fields

Revision ID: b9e30c12f4d5
Revises: a8d29b01c3e4
Create Date: 2026-08-15 19:52:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b9e30c12f4d5'
down_revision: Union[str, Sequence[str], None] = 'a8d29b01c3e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    Idempotent: skips ADD COLUMN / CREATE INDEX if already exists in DB.
    """
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_cols = {col['name'] for col in inspector.get_columns('users')}

    if 'github_id' not in existing_cols:
        op.add_column('users', sa.Column('github_id', sa.String(length=255), nullable=True))
        op.create_index(op.f('ix_users_github_id'), 'users', ['github_id'], unique=True, if_not_exists=True)

    if 'github_username' not in existing_cols:
        op.add_column('users', sa.Column('github_username', sa.String(length=255), nullable=True))

    if 'full_name' not in existing_cols:
        op.add_column('users', sa.Column('full_name', sa.String(length=100), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_cols = {col['name'] for col in inspector.get_columns('users')}

    if 'full_name' in existing_cols:
        op.drop_column('users', 'full_name')
    if 'github_username' in existing_cols:
        op.drop_column('users', 'github_username')
    if 'github_id' in existing_cols:
        op.drop_index(op.f('ix_users_github_id'), table_name='users', if_exists=True)
        op.drop_column('users', 'github_id')
