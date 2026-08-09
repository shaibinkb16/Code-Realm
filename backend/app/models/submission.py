import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class CodeSubmission(Base):
    __tablename__ = "code_submissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    challenge_id = Column(String(50), ForeignKey("challenges.id", ondelete="CASCADE"), nullable=False, index=True)
    submitted_code = Column(Text, nullable=False)
    language = Column(String(20), nullable=False)
    status = Column(String(30), nullable=False) # passed, failed, syntax_error, timeout
    execution_time_ms = Column(Integer, nullable=False)
    stars_earned = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="submissions")
    challenge = relationship("Challenge")
