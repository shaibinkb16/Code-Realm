from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict
from app.services.career_service import career_service
from app.core.database import get_db

router = APIRouter()


class SkillRatingsRequest(BaseModel):
    skill_ratings: Dict[str, int]
    rank_rating: int = 905


class InterviewAnswerRequest(BaseModel):
    question: str
    answer: str
    skill: str


@router.post("/recommend")
async def get_career_recommendations(req: SkillRatingsRequest, db: AsyncSession = Depends(get_db)):
    """Gemini generates 4 personalized career paths based on player's real skill ratings."""
    return await career_service.generate_career_recommendations(
        skill_ratings=req.skill_ratings,
        rank_rating=req.rank_rating,
        db=db,
    )


@router.post("/sprint-tickets")
async def get_sprint_tickets(req: SkillRatingsRequest, db: AsyncSession = Depends(get_db)):
    """Gemini generates AI sprint board tickets targeting the player's weakest skills."""
    return await career_service.generate_sprint_tickets(skill_ratings=req.skill_ratings, db=db)


@router.post("/interview/question")
async def get_interview_question(req: SkillRatingsRequest, db: AsyncSession = Depends(get_db)):
    """Gemini generates a technical interview question based on player's skill profile."""
    return await career_service.generate_interview_question(skill_ratings=req.skill_ratings, db=db)


@router.post("/interview/evaluate")
async def evaluate_interview(req: InterviewAnswerRequest, db: AsyncSession = Depends(get_db)):
    """Gemini evaluates the user's interview answer and returns structured score breakdown."""
    return await career_service.evaluate_interview_answer(
        question=req.question,
        answer=req.answer,
        skill=req.skill,
        db=db,
    )
