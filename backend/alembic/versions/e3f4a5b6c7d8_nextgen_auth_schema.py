"""nextgen auth schema

Revision ID: e3f4a5b6c7d8
Revises: d2e3f4a5b6c7
Create Date: 2026-08-15 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'e3f4a5b6c7d8'
down_revision: Union[str, Sequence[str], None] = 'd2e3f4a5b6c7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    # 1. Create user_sessions table
    if 'user_sessions' not in tables:
        op.create_table(
            'user_sessions',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('refresh_token_hash', sa.String(length=255), unique=True, nullable=False),
            sa.Column('device_name', sa.String(length=100), nullable=True),
            sa.Column('device_type', sa.String(length=30), server_default='desktop', nullable=False),
            sa.Column('ip_address', sa.String(length=45), nullable=True),
            sa.Column('user_agent', sa.String(length=255), nullable=True),
            sa.Column('is_current', sa.Boolean(), server_default='false', nullable=False),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
            sa.Column('last_used_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
            sa.Column('expires_at', sa.DateTime(), nullable=False),
            sa.Column('revoked_at', sa.DateTime(), nullable=True)
        )
        op.create_index('ix_user_sessions_user_id', 'user_sessions', ['user_id'], if_not_exists=True)
        op.create_index('ix_user_sessions_refresh_token_hash', 'user_sessions', ['refresh_token_hash'], if_not_exists=True)

    # 2. Create passkeys table
    if 'passkeys' not in tables:
        op.create_table(
            'passkeys',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('credential_id', sa.Text(), unique=True, nullable=False),
            sa.Column('public_key', sa.Text(), nullable=False),
            sa.Column('counter', sa.Integer(), server_default='0', nullable=False),
            sa.Column('device_type', sa.String(length=50), server_default='single_device', nullable=False),
            sa.Column('transports', sa.JSON(), server_default='[]', nullable=False),
            sa.Column('name', sa.String(length=100), server_default='Passkey Authenticator', nullable=False),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
            sa.Column('last_used_at', sa.DateTime(), nullable=True)
        )
        op.create_index('ix_passkeys_user_id', 'passkeys', ['user_id'], if_not_exists=True)
        op.create_index('ix_passkeys_credential_id', 'passkeys', ['credential_id'], if_not_exists=True)

    # 3. Create auth_events table
    if 'auth_events' not in tables:
        op.create_table(
            'auth_events',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('event_type', sa.String(length=50), nullable=False),
            sa.Column('ip_address', sa.String(length=45), nullable=True),
            sa.Column('user_agent', sa.String(length=255), nullable=True),
            sa.Column('metadata_json', sa.JSON(), server_default='{}', nullable=False),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False)
        )
        op.create_index('ix_auth_events_user_id', 'auth_events', ['user_id'], if_not_exists=True)
        op.create_index('ix_auth_events_event_type', 'auth_events', ['event_type'], if_not_exists=True)


def downgrade() -> None:
    pass
