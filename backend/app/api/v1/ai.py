from fastapi import APIRouter
from pydantic import BaseModel
from app.services.ai_mentor_service import ai_mentor_service

router = APIRouter()

class AIMentorChatRequest(BaseModel):
    message: str
    mode: str = "Explain"
    skill_rating: int = 905

@router.post("/chat")
async def chat_with_ai_mentor(req: AIMentorChatRequest):
    """Contextual AI Tutor chat endpoint with prompt injection safety and mode options."""
    response = await ai_mentor_service.generate_mentor_guidance(
        user_prompt=req.message,
        mode=req.mode,
        user_skill_rating=req.skill_rating
    )
    return response
