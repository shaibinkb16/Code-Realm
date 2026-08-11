import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy import Uuid as UUID
from app.core.database import Base

class MistakeLog(Base):
    __tablename__ = "mistake_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    challenge_id = Column(String(50), ForeignKey("challenges.id", ondelete="CASCADE"), nullable=False)
    
    # E.g. SyntaxError, IndexError, LogicError, TimeLimitExceeded
    error_type = Column(String(50), nullable=False, index=True)
    
    # E.g. 'index out of bounds', 'unexpected indent', etc.
    error_message = Column(Text, nullable=True)
    
    # Store the actual code that caused the failure
    code_snapshot = Column(Text, nullable=False)
    
    # (Optional) Store detailed AI analysis of why they failed, if we generate it
    ai_analysis = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    user = relationship("User")
    challenge = relationship("Challenge")
