import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy import Uuid as UUID
from app.core.database import Base

class Language(Base):
    __tablename__ = "languages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), unique=True, nullable=False, index=True) # e.g., Python, Rust
    display_name = Column(String(100), nullable=False)
    version = Column(String(50), nullable=False) # e.g., 3.11, 1.75
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class Topic(Base):
    __tablename__ = "topics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False, index=True) # e.g., Arrays, Trees, Hash Maps
    category = Column(String(50), nullable=False, index=True) # e.g., DSA, Problem Solving
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class UserLanguageMastery(Base):
    __tablename__ = "user_language_mastery"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    language_id = Column(UUID(as_uuid=True), ForeignKey("languages.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # E.g. syntax, functions, classes... or just an overall rating if we don't want to overcomplicate immediately.
    # We will use an overall skill rating (Elo-style) and a percentage mastery
    mastery_percentage = Column(Float, default=0.0, nullable=False)
    skill_rating = Column(Integer, default=500, nullable=False) 
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="language_mastery")
    language = relationship("Language")

class UserTopicMastery(Base):
    __tablename__ = "user_topic_mastery"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    topic_id = Column(UUID(as_uuid=True), ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True)
    
    mastery_percentage = Column(Float, default=0.0, nullable=False)
    skill_rating = Column(Integer, default=500, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="topic_mastery")
    topic = relationship("Topic")
