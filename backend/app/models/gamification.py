import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy import Uuid as UUID
from app.core.database import Base

class RatingHistory(Base):
    __tablename__ = "rating_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    domain_type = Column(String(50), nullable=False) # 'global', 'language', 'topic'
    domain_id = Column(String(50), nullable=True) # language.id or topic.id
    
    old_rating = Column(Integer, nullable=False)
    new_rating = Column(Integer, nullable=False)
    change_reason = Column(String(100), nullable=False) # e.g. 'challenge_completed'
    challenge_id = Column(String(50), ForeignKey("challenges.id", ondelete="SET NULL"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class Achievement(Base):
    __tablename__ = "achievements"
    
    id = Column(String(50), primary_key=True)
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    icon_name = Column(String(50), nullable=False)
    category = Column(String(50), nullable=False) # 'learning', 'combat', 'social'
    xp_reward = Column(Integer, default=100)
    coin_reward = Column(Integer, default=50)

class UserAchievement(Base):
    __tablename__ = "user_achievements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    achievement_id = Column(String(50), ForeignKey("achievements.id", ondelete="CASCADE"), nullable=False)
    unlocked_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User")
    achievement = relationship("Achievement")


class RewardGrant(Base):
    """
    Append-only ledger of every reward ever granted, keyed by an idempotency
    key so a retried or double-clicked request cannot award twice.

    The unique constraint on idempotency_key is what actually enforces this —
    RewardService relies on the database rejecting the duplicate rather than on
    a read-then-write check, which would race under concurrent submissions.
    """
    __tablename__ = "reward_grants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    idempotency_key = Column(String(200), nullable=False, unique=True, index=True)

    reason = Column(String(100), nullable=False)  # challenge_completed, achievement, daily_mission, ...
    reference_id = Column(String(100), nullable=True)  # challenge_id / node_id / mission_id

    xp_granted = Column(Integer, default=0, nullable=False)
    coins_granted = Column(Integer, default=0, nullable=False)
    stars_granted = Column(Integer, default=0, nullable=False)
    rating_delta = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
