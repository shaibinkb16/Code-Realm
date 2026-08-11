import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy import Uuid as UUID
from app.core.database import Base

class Contest(Base):
    __tablename__ = "contests"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    title = Column(String(100), nullable=False)
    description = Column(String(500), nullable=True)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    status = Column(String(20), default="upcoming") # upcoming, active, completed
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    participants = relationship("ContestParticipant", back_populates="contest", cascade="all, delete-orphan")
    submissions = relationship("ContestSubmission", back_populates="contest", cascade="all, delete-orphan")

class ContestParticipant(Base):
    __tablename__ = "contest_participants"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contest_id = Column(UUID(as_uuid=True), ForeignKey("contests.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    score = Column(Integer, default=0, nullable=False)
    registered_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    contest = relationship("Contest", back_populates="participants")
    user = relationship("User")

class ContestSubmission(Base):
    __tablename__ = "contest_submissions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contest_id = Column(UUID(as_uuid=True), ForeignKey("contests.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    challenge_id = Column(String(50), nullable=False) # ID of the challenge generated/selected for the contest
    
    code = Column(String, nullable=False)
    language = Column(String(20), default="python")
    passed = Column(Boolean, default=False)
    execution_time_ms = Column(Integer, nullable=True)
    time_to_solve_seconds = Column(Integer, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    contest = relationship("Contest", back_populates="submissions")
    user = relationship("User")
