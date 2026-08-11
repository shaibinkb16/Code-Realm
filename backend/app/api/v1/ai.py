from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional
from app.services.ai_mentor_service import ai_mentor_service
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.intelligence import MistakeLog

router = APIRouter()

class AIMentorGuidanceRequest(BaseModel):
    challenge_id: str
    user_code: str
    mode: str = "Explain"

@router.post("/guidance")
async def chat_with_ai_mentor(
    req: AIMentorGuidanceRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Contextual AI Tutor chat endpoint with prompt injection safety and mode options."""
    
    # Fetch recent mistakes for this user
    res = await db.execute(
        select(MistakeLog)
        .where(MistakeLog.user_id == current_user.id)
        .order_by(MistakeLog.created_at.desc())
        .limit(3)
    )
    mistakes = res.scalars().all()
    recent_errors = [f"{m.error_type}: {m.error_message}" for m in mistakes]
    
    skill = current_user.profile.rank_rating if current_user.profile else 1000

    response = await ai_mentor_service.generate_mentor_guidance(
        user_code=req.user_code,
        challenge_id=req.challenge_id,
        mode=req.mode,
        user_skill_rating=skill,
        recent_errors=recent_errors
    )
    return response
