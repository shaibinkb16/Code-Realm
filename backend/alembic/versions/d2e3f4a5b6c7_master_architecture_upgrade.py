"""master architecture upgrade

Revision ID: d2e3f4a5b6c7
Revises: c1f2e3d4a5b6
Create Date: 2026-08-15 20:38:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'd2e3f4a5b6c7'
down_revision: Union[str, Sequence[str], None] = 'c1f2e3d4a5b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    # 1. Update realms table
    realm_cols = {col['name'] for col in inspector.get_columns('realms')}
    if 'is_active' not in realm_cols:
        op.add_column('realms', sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False))
    if 'created_at' not in realm_cols:
        op.add_column('realms', sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False))
    if 'updated_at' not in realm_cols:
        op.add_column('realms', sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False))

    # 2. Update map_nodes table
    node_cols = {col['name'] for col in inspector.get_columns('map_nodes')}
    if 'difficulty' not in node_cols:
        op.add_column('map_nodes', sa.Column('difficulty', sa.String(length=30), server_default='Medium', nullable=False))
    if 'min_skill_rating' not in node_cols:
        op.add_column('map_nodes', sa.Column('min_skill_rating', sa.Integer(), server_default='300', nullable=False))
    if 'max_skill_rating' not in node_cols:
        op.add_column('map_nodes', sa.Column('max_skill_rating', sa.Integer(), server_default='2500', nullable=False))
    if 'order_num' not in node_cols:
        op.add_column('map_nodes', sa.Column('order_num', sa.Integer(), server_default='1', nullable=False))
    if 'is_active' not in node_cols:
        op.add_column('map_nodes', sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False))
    if 'created_at' not in node_cols:
        op.add_column('map_nodes', sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False))
    if 'updated_at' not in node_cols:
        op.add_column('map_nodes', sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False))

    # 3. Update users table columns
    user_cols = {col['name'] for col in inspector.get_columns('users')}
    if 'email_verified' not in user_cols:
        op.add_column('users', sa.Column('email_verified', sa.Boolean(), server_default='false', nullable=False))
    if 'failed_login_attempts' not in user_cols:
        op.add_column('users', sa.Column('failed_login_attempts', sa.Integer(), server_default='0', nullable=False))
    if 'locked_until' not in user_cols:
        op.add_column('users', sa.Column('locked_until', sa.DateTime(), nullable=True))
    if 'mfa_enabled' not in user_cols:
        op.add_column('users', sa.Column('mfa_enabled', sa.Boolean(), server_default='false', nullable=False))
    if 'mfa_secret_encrypted' not in user_cols:
        op.add_column('users', sa.Column('mfa_secret_encrypted', sa.String(length=255), nullable=True))
    if 'timezone' not in user_cols:
        op.add_column('users', sa.Column('timezone', sa.String(length=50), server_default='UTC', nullable=False))
    if 'is_deleted' not in user_cols:
        op.add_column('users', sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=False))
    if 'deleted_at' not in user_cols:
        op.add_column('users', sa.Column('deleted_at', sa.DateTime(), nullable=True))
    if 'updated_at' not in user_cols:
        op.add_column('users', sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False))
    if 'last_login_at' not in user_cols:
        op.add_column('users', sa.Column('last_login_at', sa.DateTime(), nullable=True))
    if 'last_login_ip' not in user_cols:
        op.add_column('users', sa.Column('last_login_ip', sa.String(length=45), nullable=True))
    
    # Allow NULL in users.hashed_password for OAuth users
    op.alter_column('users', 'hashed_password', existing_type=sa.String(length=255), nullable=True)

    # 2. Create question_sets table
    if 'question_sets' not in tables:
        op.create_table(
            'question_sets',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('realm_id', sa.String(length=50), sa.ForeignKey('realms.id', ondelete='CASCADE'), nullable=False),
            sa.Column('node_id', sa.String(length=50), sa.ForeignKey('map_nodes.id', ondelete='CASCADE'), nullable=False),
            sa.Column('language_id', sa.String(length=50), server_default='python', nullable=False),
            sa.Column('difficulty', sa.String(length=30), nullable=False),
            sa.Column('min_skill_rating', sa.Integer(), server_default='300', nullable=False),
            sa.Column('max_skill_rating', sa.Integer(), server_default='2500', nullable=False),
            sa.Column('generation_model', sa.String(length=60), server_default='gemini-3.6-flash', nullable=False),
            sa.Column('prompt_version', sa.String(length=30), server_default='question-generator-v4', nullable=False),
            sa.Column('generation_version', sa.Integer(), server_default='1', nullable=False),
            sa.Column('status', sa.String(length=20), server_default='ACTIVE', nullable=False),
            sa.Column('quality_score', sa.Float(), server_default='0.0', nullable=False),
            sa.Column('content_hash', sa.String(length=64), nullable=False),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False)
        )
        op.create_index('ix_question_sets_realm_id', 'question_sets', ['realm_id'], if_not_exists=True)
        op.create_index('ix_question_sets_node_id', 'question_sets', ['node_id'], if_not_exists=True)
        op.create_index('ix_question_sets_language_id', 'question_sets', ['language_id'], if_not_exists=True)
        op.create_index('ix_question_sets_difficulty', 'question_sets', ['difficulty'], if_not_exists=True)

    # 3. Update challenges table columns
    chal_cols = {col['name'] for col in inspector.get_columns('challenges')}
    if 'question_set_id' not in chal_cols:
        op.add_column('challenges', sa.Column('question_set_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('question_sets.id', ondelete='CASCADE'), nullable=True))
        op.create_index('ix_challenges_question_set_id', 'challenges', ['question_set_id'], if_not_exists=True)
    if 'generation_model' not in chal_cols:
        op.add_column('challenges', sa.Column('generation_model', sa.String(length=60), server_default='gemini-3.6-flash', nullable=True))
    if 'prompt_version' not in chal_cols:
        op.add_column('challenges', sa.Column('prompt_version', sa.String(length=30), server_default='v4', nullable=True))
    if 'status' not in chal_cols:
        op.add_column('challenges', sa.Column('status', sa.String(length=20), server_default='ACTIVE', nullable=False))
    if 'review_status' not in chal_cols:
        op.add_column('challenges', sa.Column('review_status', sa.String(length=20), server_default='unreviewed', nullable=False))
    if 'report_count' not in chal_cols:
        op.add_column('challenges', sa.Column('report_count', sa.Integer(), server_default='0', nullable=False))
    if 'content_hash' not in chal_cols:
        op.add_column('challenges', sa.Column('content_hash', sa.String(length=64), nullable=True))
    if 'swap_count' not in chal_cols:
        op.add_column('challenges', sa.Column('swap_count', sa.Integer(), server_default='0', nullable=False))
    if 'last_validated_at' not in chal_cols:
        op.add_column('challenges', sa.Column('last_validated_at', sa.DateTime(), nullable=True))
    if 'is_deleted' not in chal_cols:
        op.add_column('challenges', sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=False))
    if 'updated_at' not in chal_cols:
        op.add_column('challenges', sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False))

    # 4. Update test_cases table
    tc_cols = {col['name'] for col in inspector.get_columns('test_cases')}
    if 'order_num' not in tc_cols:
        op.add_column('test_cases', sa.Column('order_num', sa.Integer(), server_default='0', nullable=False))
    if 'timeout_ms' not in tc_cols:
        op.add_column('test_cases', sa.Column('timeout_ms', sa.Integer(), server_default='5000', nullable=False))
    if 'created_at' not in tc_cols:
        op.add_column('test_cases', sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False))

    # 5. Update user_node_assignments table columns
    assign_cols = {col['name'] for col in inspector.get_columns('user_node_assignments')}
    if 'question_set_id' not in assign_cols:
        op.add_column('user_node_assignments', sa.Column('question_set_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('question_sets.id', ondelete='SET NULL'), nullable=True))
    if 'swap_count' not in assign_cols:
        op.add_column('user_node_assignments', sa.Column('swap_count', sa.Integer(), server_default='0', nullable=False))
    if 'started_at' not in assign_cols:
        op.add_column('user_node_assignments', sa.Column('started_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False))
    if 'last_opened_at' not in assign_cols:
        op.add_column('user_node_assignments', sa.Column('last_opened_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False))
    if 'completed_at' not in assign_cols:
        op.add_column('user_node_assignments', sa.Column('completed_at', sa.DateTime(), nullable=True))

    # 5. Create user_node_assignment_history table
    if 'user_node_assignment_history' not in tables:
        op.create_table(
            'user_node_assignment_history',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('assignment_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('user_node_assignments.id', ondelete='CASCADE'), nullable=False),
            sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('node_id', sa.String(length=50), nullable=False),
            sa.Column('event_type', sa.String(length=20), nullable=False),
            sa.Column('challenge_id', sa.String(length=50), nullable=False),
            sa.Column('saved_code_snapshot', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False)
        )
        op.create_index('ix_user_node_assignment_history_assignment_id', 'user_node_assignment_history', ['assignment_id'], if_not_exists=True)
        op.create_index('ix_user_node_assignment_history_user_id', 'user_node_assignment_history', ['user_id'], if_not_exists=True)

    # 5. Create user_node_progress table
    if 'user_node_progress' not in tables:
        op.create_table(
            'user_node_progress',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('node_id', sa.String(length=50), sa.ForeignKey('map_nodes.id', ondelete='CASCADE'), nullable=False),
            sa.Column('status', sa.String(length=20), server_default='unlocked', nullable=False),
            sa.Column('stars', sa.Integer(), server_default='0', nullable=False),
            sa.Column('best_score', sa.Integer(), nullable=True),
            sa.Column('attempts', sa.Integer(), server_default='0', nullable=False),
            sa.Column('successful_attempts', sa.Integer(), server_default='0', nullable=False),
            sa.Column('first_completed_at', sa.DateTime(), nullable=True),
            sa.Column('last_completed_at', sa.DateTime(), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
            sa.UniqueConstraint('user_id', 'node_id', name='uq_user_node_progress')
        )
        op.create_index('ix_user_node_progress_user_id', 'user_node_progress', ['user_id'], if_not_exists=True)
        op.create_index('ix_user_node_progress_node_id', 'user_node_progress', ['node_id'], if_not_exists=True)

    # 6. Governance & Administration Tables
    if 'admin_roles' not in tables:
        op.create_table(
            'admin_roles',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('name', sa.String(length=30), unique=True, nullable=False),
            sa.Column('description', sa.String(length=255), nullable=True),
            sa.Column('permissions', sa.JSON(), server_default='[]', nullable=False),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False)
        )

    if 'user_admin_roles' not in tables:
        op.create_table(
            'user_admin_roles',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('role_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('admin_roles.id', ondelete='CASCADE'), nullable=False),
            sa.Column('granted_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('granted_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
            sa.Column('revoked_at', sa.DateTime(), nullable=True)
        )
        op.create_index('ix_user_admin_roles_user_id', 'user_admin_roles', ['user_id'], if_not_exists=True)

    if 'user_sanctions' not in tables:
        op.create_table(
            'user_sanctions',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('type', sa.String(length=20), nullable=False),
            sa.Column('reason', sa.Text(), nullable=False),
            sa.Column('issued_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('expires_at', sa.DateTime(), nullable=True),
            sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False)
        )
        op.create_index('ix_user_sanctions_user_id', 'user_sanctions', ['user_id'], if_not_exists=True)

    if 'system_settings' not in tables:
        op.create_table(
            'system_settings',
            sa.Column('key', sa.String(length=100), primary_key=True),
            sa.Column('value', sa.JSON(), nullable=False),
            sa.Column('updated_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False)
        )

    if 'admin_action_logs' not in tables:
        op.create_table(
            'admin_action_logs',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('admin_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('action', sa.String(length=100), nullable=False),
            sa.Column('target_type', sa.String(length=50), nullable=True),
            sa.Column('target_id', sa.String(length=100), nullable=True),
            sa.Column('before_state', sa.JSON(), nullable=True),
            sa.Column('after_state', sa.JSON(), nullable=True),
            sa.Column('ip_address', sa.String(length=45), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False)
        )
        op.create_index('ix_admin_action_logs_admin_user_id', 'admin_action_logs', ['admin_user_id'], if_not_exists=True)

    if 'challenge_reports' not in tables:
        op.create_table(
            'challenge_reports',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('challenge_id', sa.String(length=50), sa.ForeignKey('challenges.id', ondelete='CASCADE'), nullable=False),
            sa.Column('reported_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('reason', sa.String(length=50), nullable=False),
            sa.Column('details', sa.Text(), nullable=True),
            sa.Column('status', sa.String(length=20), server_default='open', nullable=False),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False)
        )
        op.create_index('ix_challenge_reports_challenge_id', 'challenge_reports', ['challenge_id'], if_not_exists=True)

    if 'llm_usage_logs' not in tables:
        op.create_table(
            'llm_usage_logs',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('provider', sa.String(length=30), nullable=False),
            sa.Column('model', sa.String(length=60), nullable=False),
            sa.Column('feature', sa.String(length=50), nullable=False),
            sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('request_id', sa.String(length=100), nullable=False),
            sa.Column('input_tokens', sa.Integer(), nullable=True),
            sa.Column('output_tokens', sa.Integer(), nullable=True),
            sa.Column('total_tokens', sa.Integer(), nullable=True),
            sa.Column('latency_ms', sa.Integer(), nullable=True),
            sa.Column('status', sa.String(length=20), nullable=False),
            sa.Column('error_type', sa.String(length=50), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False)
        )
        op.create_index('ix_llm_usage_logs_provider', 'llm_usage_logs', ['provider'], if_not_exists=True)
        op.create_index('ix_llm_usage_logs_feature', 'llm_usage_logs', ['feature'], if_not_exists=True)

    if 'refresh_tokens' not in tables:
        op.create_table(
            'refresh_tokens',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('token_hash', sa.String(length=255), unique=True, nullable=False),
            sa.Column('is_revoked', sa.Boolean(), server_default='false', nullable=False),
            sa.Column('replaced_by_id', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('ip_address', sa.String(length=45), nullable=True),
            sa.Column('user_agent', sa.String(length=255), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
            sa.Column('expires_at', sa.DateTime(), nullable=False)
        )
        op.create_index('ix_refresh_tokens_user_id', 'refresh_tokens', ['user_id'], if_not_exists=True)

    if 'audit_logs' not in tables:
        op.create_table(
            'audit_logs',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('action', sa.String(length=100), nullable=False),
            sa.Column('resource_type', sa.String(length=50), nullable=True),
            sa.Column('resource_id', sa.String(length=100), nullable=True),
            sa.Column('ip_address', sa.String(length=45), nullable=True),
            sa.Column('user_agent', sa.String(length=255), nullable=True),
            sa.Column('metadata_json', sa.JSON(), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False)
        )
        op.create_index('ix_audit_logs_user_id', 'audit_logs', ['user_id'], if_not_exists=True)


def downgrade() -> None:
    pass
