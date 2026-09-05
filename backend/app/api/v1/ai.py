from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional
from app.services.ai_mentor_service import ai_mentor_service
from app.api.deps import get_db, get_current_user, get_optional_user
from app.models.user import User
from app.models.intelligence import MistakeLog

router = APIRouter()

class AIMentorGuidanceRequest(BaseModel):
    challenge_id: str
    user_code: str
    mode: str = "Explain"

class AIMentorChatRequest(BaseModel):
    message: str
    mode: str = "Explain"
    skill_rating: Optional[int] = 1000

@router.post("/chat")
async def general_ai_mentor_chat(
    req: AIMentorChatRequest,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    """General AI Tutor chat endpoint for AI Companion Modal & Daily Briefings."""
    skill = req.skill_rating or 1000
    if current_user and current_user.profile:
        skill = current_user.profile.rank_rating or skill

    response = await ai_mentor_service.chat_with_mentor(
        message=req.message,
        mode=req.mode,
        user_skill_rating=skill,
        db=db,
        user_id=current_user.id if current_user else None,
    )
    return response

@router.post("/guidance")
async def chat_with_ai_mentor(
    req: AIMentorGuidanceRequest,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    """Contextual AI Tutor chat endpoint with prompt injection safety and mode options."""
    
    # Fetch recent mistakes for this user
    recent_errors = []
    skill = 1000
    if current_user:
        res = await db.execute(
            select(MistakeLog)
            .where(MistakeLog.user_id == current_user.id)
            .order_by(MistakeLog.created_at.desc())
            .limit(3)
        )
        mistakes = res.scalars().all()
        recent_errors = [f"{m.error_type}: {m.error_message}" for m in mistakes]
        if current_user.profile:
            skill = current_user.profile.rank_rating or 1000

    response = await ai_mentor_service.generate_mentor_guidance(
        user_code=req.user_code,
        challenge_id=req.challenge_id,
        mode=req.mode,
        user_skill_rating=skill,
        recent_errors=recent_errors,
        db=db,
        user_id=current_user.id if current_user else None,
    )
    return response
