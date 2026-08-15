"""add question bank and assignments

Revision ID: c1f2e3d4a5b6
Revises: b9e30c12f4d5
Create Date: 2026-08-15 20:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c1f2e3d4a5b6'
down_revision: Union[str, Sequence[str], None] = 'b9e30c12f4d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    Idempotent: skips ADD COLUMN / CREATE TABLE / CREATE INDEX if already exists in DB.
    """
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_cols = {col['name'] for col in inspector.get_columns('challenges')}

    if 'node_id' not in existing_cols:
        op.add_column('challenges', sa.Column('node_id', sa.String(length=50), nullable=True))
        op.create_index(op.f('ix_challenges_node_id'), 'challenges', ['node_id'], unique=False, if_not_exists=True)

    if 'realm_id' not in existing_cols:
        op.add_column('challenges', sa.Column('realm_id', sa.String(length=50), nullable=True))
        op.create_index(op.f('ix_challenges_realm_id'), 'challenges', ['realm_id'], unique=False, if_not_exists=True)

    if 'alternate_index' not in existing_cols:
        op.add_column('challenges', sa.Column('alternate_index', sa.Integer(), nullable=False, server_default='0'))

    if 'min_skill_rating' not in existing_cols:
        op.add_column('challenges', sa.Column('min_skill_rating', sa.Integer(), nullable=False, server_default='300'))

    if 'max_skill_rating' not in existing_cols:
        op.add_column('challenges', sa.Column('max_skill_rating', sa.Integer(), nullable=False, server_default='2500'))

    # Create user_node_assignments table if not exists
    tables = inspector.get_table_names()
    if 'user_node_assignments' not in tables:
        op.create_table(
            'user_node_assignments',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('node_id', sa.String(length=50), nullable=False),
            sa.Column('challenge_id', sa.String(length=50), sa.ForeignKey('challenges.id', ondelete='CASCADE'), nullable=False),
            sa.Column('saved_code', sa.Text(), nullable=True),
            sa.Column('is_completed', sa.Boolean(), nullable=False, server_default='false'),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        )
        op.create_index(op.f('ix_user_node_assignments_user_id'), 'user_node_assignments', ['user_id'], unique=False, if_not_exists=True)
        op.create_index(op.f('ix_user_node_assignments_node_id'), 'user_node_assignments', ['node_id'], unique=False, if_not_exists=True)


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'user_node_assignments' in tables:
        op.drop_index(op.f('ix_user_node_assignments_node_id'), table_name='user_node_assignments', if_exists=True)
        op.drop_index(op.f('ix_user_node_assignments_user_id'), table_name='user_node_assignments', if_exists=True)
        op.drop_table('user_node_assignments')

    existing_cols = {col['name'] for col in inspector.get_columns('challenges')}
    if 'max_skill_rating' in existing_cols:
        op.drop_column('challenges', 'max_skill_rating')
    if 'min_skill_rating' in existing_cols:
        op.drop_column('challenges', 'min_skill_rating')
    if 'alternate_index' in existing_cols:
        op.drop_column('challenges', 'alternate_index')
    if 'realm_id' in existing_cols:
        op.drop_index(op.f('ix_challenges_realm_id'), table_name='challenges', if_exists=True)
        op.drop_column('challenges', 'realm_id')
    if 'node_id' in existing_cols:
        op.drop_index(op.f('ix_challenges_node_id'), table_name='challenges', if_exists=True)
        op.drop_column('challenges', 'node_id')
