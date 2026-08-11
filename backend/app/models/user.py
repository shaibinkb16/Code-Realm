import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy import Uuid as UUID
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="user", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    language_mastery = relationship("UserLanguageMastery", back_populates="user", cascade="all, delete-orphan")
    topic_mastery = relationship("UserTopicMastery", back_populates="user", cascade="all, delete-orphan")
    submissions = relationship("CodeSubmission", back_populates="user", cascade="all, delete-orphan")

class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    title = Column(String(100), default="Code Realm Explorer ⚔️")
    avatar = Column(String(255), default="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80")
    level = Column(Integer, default=1, nullable=False)
    xp = Column(Integer, default=0, nullable=False)
    next_level_xp = Column(Integer, default=1000, nullable=False)
    coins = Column(Integer, default=100, nullable=False)
    stars = Column(Integer, default=0, nullable=False)
    streak = Column(Integer, default=1, nullable=False)
    last_activity_date = Column(DateTime, nullable=True)
    rank = Column(String(30), default="Bronze", nullable=False)
    rank_rating = Column(Integer, default=500, nullable=False)
    pet_stage = Column(String(30), default="Baby", nullable=False)
    pet_level = Column(Integer, default=1, nullable=False)
    hq_level = Column(String(50), default="Room", nullable=False)

    user = relationship("User", back_populates="profile")


