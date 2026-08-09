from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict
from app.services.career_service import career_service

router = APIRouter()


class SkillRatingsRequest(BaseModel):
    skill_ratings: Dict[str, int]
    rank_rating: int = 905


class InterviewAnswerRequest(BaseModel):
    question: str
    answer: str
    skill: str


@router.post("/recommend")
async def get_career_recommendations(req: SkillRatingsRequest):
    """Gemini generates 4 personalized career paths based on player's real skill ratings."""
    return await career_service.generate_career_recommendations(
        skill_ratings=req.skill_ratings,
        rank_rating=req.rank_rating
    )


@router.post("/sprint-tickets")
async def get_sprint_tickets(req: SkillRatingsRequest):
    """Gemini generates AI sprint board tickets targeting the player's weakest skills."""
    return await career_service.generate_sprint_tickets(skill_ratings=req.skill_ratings)


@router.post("/interview/question")
async def get_interview_question(req: SkillRatingsRequest):
    """Gemini generates a technical interview question based on player's skill profile."""
    return await career_service.generate_interview_question(skill_ratings=req.skill_ratings)


@router.post("/interview/evaluate")
async def evaluate_interview(req: InterviewAnswerRequest):
    """Gemini evaluates the user's interview answer and returns structured score breakdown."""
    return await career_service.evaluate_interview_answer(
        question=req.question,
        answer=req.answer,
        skill=req.skill
    )
