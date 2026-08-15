import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, Text, ForeignKey, JSON, DateTime, Float, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class Realm(Base):
    __tablename__ = "realms"

    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    tagline = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    order_num = Column(Integer, nullable=False, index=True)
    is_unlocked = Column(Boolean, default=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    theme_color = Column(String(20), nullable=False)
    icon = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    nodes = relationship("MapNode", back_populates="realm", cascade="all, delete-orphan")


class MapNode(Base):
    __tablename__ = "map_nodes"

    id = Column(String(50), primary_key=True)
    realm_id = Column(String(50), ForeignKey("realms.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(150), nullable=False)
    type = Column(String(30), nullable=False)
    x_coord = Column(Integer, nullable=False)
    y_coord = Column(Integer, nullable=False)
    difficulty = Column(String(30), default="Medium", nullable=False)
    min_skill_rating = Column(Integer, default=300, nullable=False)
    max_skill_rating = Column(Integer, default=2500, nullable=False)
    order_num = Column(Integer, default=1, nullable=False)
    prerequisites = Column(JSON, default=list, nullable=False)
    icon_name = Column(String(50), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    realm = relationship("Realm", back_populates="nodes")
    question_sets = relationship("QuestionSet", back_populates="node", cascade="all, delete-orphan")


class QuestionSet(Base):
    __tablename__ = "question_sets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    realm_id = Column(String(50), ForeignKey("realms.id", ondelete="CASCADE"), nullable=False, index=True)
    node_id = Column(String(50), ForeignKey("map_nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    language_id = Column(String(50), nullable=False, default="python", index=True)
    difficulty = Column(String(30), nullable=False, index=True)
    min_skill_rating = Column(Integer, default=300, nullable=False)
    max_skill_rating = Column(Integer, default=2500, nullable=False)
    generation_model = Column(String(60), default="gemini-3.6-flash", nullable=False)
    prompt_version = Column(String(30), default="question-generator-v4", nullable=False)
    generation_version = Column(Integer, default=1, nullable=False)
    status = Column(String(20), default="ACTIVE", nullable=False) # pending, validating, active, retired, failed
    quality_score = Column(Float, default=0.0, nullable=False)
    content_hash = Column(String(64), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    node = relationship("MapNode", back_populates="question_sets")
    challenges = relationship("Challenge", back_populates="question_set", cascade="all, delete-orphan")


class Challenge(Base):
    __tablename__ = "challenges"

    id = Column(String(50), primary_key=True)
    question_set_id = Column(UUID(as_uuid=True), ForeignKey("question_sets.id", ondelete="CASCADE"), nullable=True, index=True)
    node_id = Column(String(50), nullable=True, index=True)
    realm_id = Column(String(50), nullable=True, index=True)
    alternate_index = Column(Integer, default=0, nullable=False) # 0 = Primary, 1 = Alt 1, 2 = Alt 2
    min_skill_rating = Column(Integer, default=300, nullable=False)
    max_skill_rating = Column(Integer, default=2500, nullable=False)
    title = Column(String(150), nullable=False)
    type = Column(String(30), nullable=False, index=True)
    difficulty = Column(String(30), nullable=False)
    description = Column(Text, nullable=False)
    story_context = Column(Text, nullable=True)
    initial_code = Column(Text, nullable=False)
    language = Column(String(20), nullable=False)
    xp_reward = Column(Integer, nullable=False)
    coin_reward = Column(Integer, nullable=False)
    explanation = Column(Text, nullable=False)
    
    # Metadata & Quality Control
    tags = Column(JSON, default=list, nullable=False)
    canonical_solution = Column(Text, nullable=True)
    hints = Column(JSON, default=list, nullable=False)
    generated_by = Column(String(50), default="ai", nullable=False)
    generation_model = Column(String(60), default="gemini-3.6-flash", nullable=True)
    prompt_version = Column(String(30), default="v4", nullable=True)
    validation_status = Column(String(30), default="approved", nullable=False)
    status = Column(String(20), default="ACTIVE", nullable=False)
    review_status = Column(String(20), default="unreviewed", nullable=False)
    report_count = Column(Integer, default=0, nullable=False)
    quality_score = Column(Float, default=0.0, nullable=False)
    content_hash = Column(String(64), nullable=True, index=True)
    usage_count = Column(Integer, default=0, nullable=False)
    swap_count = Column(Integer, default=0, nullable=False)
    last_validated_at = Column(DateTime, nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    question_set = relationship("QuestionSet", back_populates="challenges")
    test_cases = relationship("TestCase", back_populates="challenge", cascade="all, delete-orphan")


class TestCase(Base):
    __tablename__ = "test_cases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    challenge_id = Column(String(50), ForeignKey("challenges.id", ondelete="CASCADE"), nullable=False, index=True)
    input_data = Column(Text, nullable=False)
    expected_output = Column(Text, nullable=False)
    description = Column(String(255), nullable=False)
    is_hidden = Column(Boolean, default=False, nullable=False)
    order_num = Column(Integer, default=0, nullable=False)
    timeout_ms = Column(Integer, default=5000, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    challenge = relationship("Challenge", back_populates="test_cases")


class UserNodeAssignment(Base):
    __tablename__ = "user_node_assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    node_id = Column(String(50), nullable=False, index=True)
    question_set_id = Column(UUID(as_uuid=True), ForeignKey("question_sets.id", ondelete="SET NULL"), nullable=True)
    challenge_id = Column(String(50), ForeignKey("challenges.id", ondelete="CASCADE"), nullable=False)
    saved_code = Column(Text, nullable=True)
    swap_count = Column(Integer, default=0, nullable=False)
    is_completed = Column(Boolean, default=False, nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_opened_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="node_assignments")
    challenge = relationship("Challenge")
    history = relationship("UserNodeAssignmentHistory", back_populates="assignment", cascade="all, delete-orphan")

    __table_args__ = (UniqueConstraint('user_id', 'node_id', name='uq_user_node_assignment'),)


class UserNodeAssignmentHistory(Base):
    __tablename__ = "user_node_assignment_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assignment_id = Column(UUID(as_uuid=True), ForeignKey("user_node_assignments.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    node_id = Column(String(50), nullable=False)
    event_type = Column(String(20), nullable=False) # ASSIGNED, SWAPPED, COMPLETED, RESET
    challenge_id = Column(String(50), nullable=False)
    saved_code_snapshot = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    assignment = relationship("UserNodeAssignment", back_populates="history")


class UserNodeProgress(Base):
    __tablename__ = "user_node_progress"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    node_id = Column(String(50), ForeignKey("map_nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(20), default="unlocked", nullable=False) # locked, unlocked, in_progress, completed
    stars = Column(Integer, default=0, nullable=False)
    best_score = Column(Integer, nullable=True)
    attempts = Column(Integer, default=0, nullable=False)
    successful_attempts = Column(Integer, default=0, nullable=False)
    first_completed_at = Column(DateTime, nullable=True)
    last_completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (UniqueConstraint('user_id', 'node_id', name='uq_user_node_progress'),)
