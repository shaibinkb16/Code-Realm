from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import Optional, List
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.challenge import Challenge
from app.models.intelligence import MistakeLog
from app.models.learning import UserLanguageMastery, UserTopicMastery, Topic
from app.services.ai_mentor_service import ai_mentor_service
from pydantic import BaseModel
import random
import uuid
from datetime import datetime, timedelta
from app.models.contest import Contest, ContestParticipant

router = APIRouter()

class DiagnosticAnswer(BaseModel):
    question_id: str
    answer: str

class DiagnosticRequest(BaseModel):
    answers: List[DiagnosticAnswer]

@router.get("/recommend")
async def recommend_practice(
    mode: str = Query("adaptive", description="adaptive or revision"),
    language: str = Query("python", description="Target programming language"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Recommends the next best problem for the user.
    - Adaptive: Finds a problem matching their Elo.
    - Revision: Pulls a problem they previously failed.
    """
    if mode == "revision":
        # Find a problem from MistakeLog
        res = await db.execute(
            select(Challenge)
            .options(selectinload(Challenge.test_cases))
            .join(MistakeLog, Challenge.id == MistakeLog.challenge_id)
            .where(MistakeLog.user_id == current_user.id)
            .limit(10)
        )
        challenges = res.scalars().all()
        if challenges:
            c = random.choice(challenges)
            # We would typically serialize this properly, but returning a dict for MVP
            return {
                "status": "SUCCESS",
                "challenge": {
                    "id": c.id,
                    "title": c.title,
                    "description": c.description,
                    "initialCode": c.initial_code,
                    "difficulty": c.difficulty,
                    "testCases": [{"id": str(t.id), "input": t.input_data, "expectedOutput": t.expected_output, "description": t.description} for t in c.test_cases] if c.test_cases else []
                }
            }
        # Fall back to adaptive if no mistakes
        mode = "adaptive"

    if mode == "adaptive":
        target_elo = current_user.profile.rank_rating if current_user.profile else 1000

        # Mastery-aware targeting: find the user's weakest tracked challenge
        # type (see MasteryService, which populates this on every graded
        # submission) and recommend from there, using that topic's own skill
        # rating rather than the flat global Elo — this is what actually
        # closes the gap between "recommend the next challenge" and "target
        # what this specific user is worst at," instead of only banding on
        # one overall number. Falls back to the old global-rating behavior
        # for a brand-new user with no mastery data yet.
        weakest_topic_name: Optional[str] = None
        res_weak = await db.execute(
            select(Topic.name, UserTopicMastery.skill_rating)
            .join(UserTopicMastery, UserTopicMastery.topic_id == Topic.id)
            .where(UserTopicMastery.user_id == current_user.id)
            .order_by(UserTopicMastery.mastery_percentage.asc())
            .limit(1)
        )
        weakest_row = res_weak.first()
        if weakest_row:
            weakest_topic_name, topic_rating = weakest_row
            target_elo = topic_rating

        target_diff = "Easy" if target_elo < 1200 else ("Medium" if target_elo < 1800 else "Hard")

        query = select(Challenge).options(selectinload(Challenge.test_cases)).where(Challenge.difficulty == target_diff)
        if weakest_topic_name:
            query = query.where(Challenge.type == weakest_topic_name)
        res = await db.execute(query.limit(10))
        challenges = res.scalars().all()

        # A weakest-topic filter can legitimately return nothing (no existing
        # challenge of that exact type/difficulty yet) — fall back to any
        # difficulty-matched challenge rather than failing the recommendation.
        if not challenges and weakest_topic_name:
            res = await db.execute(
                select(Challenge).options(selectinload(Challenge.test_cases)).where(Challenge.difficulty == target_diff).limit(10)
            )
            challenges = res.scalars().all()

        if challenges:
            c = random.choice(challenges)
            return {
                "status": "SUCCESS",
                "targeted_weak_topic": weakest_topic_name,
                "challenge": {
                    "id": c.id,
                    "title": c.title,
                    "description": c.description,
                    "initialCode": c.initial_code,
                    "difficulty": c.difficulty,
                    "testCases": [{"id": str(t.id), "input": t.input_data, "expectedOutput": t.expected_output, "description": t.description} for t in c.test_cases] if c.test_cases else []
                }
            }

        # If no challenge found in DB, fallback to AI generation & persist in DB QuestionBank
        from app.services.question_bank_service import QuestionBankService
        qset = await QuestionBankService(db).get_or_create_question_set(
            node_id=f"practice-{target_diff.lower()}",
            node_title=f"Adaptive Practice ({target_diff})",
            realm_name="Training Grounds",
            node_type="challenge",
            skill_rating=target_elo,
            target_language=language
        )
        c = qset.challenges[0]
        return {
            "status": "SUCCESS",
            "targeted_weak_topic": weakest_topic_name,
            "challenge": {
                "id": c.id,
                "title": c.title,
                "description": c.description,
                "initialCode": c.initial_code,
                "difficulty": c.difficulty,
                "testCases": [{"id": str(t.id), "input": t.input_data, "expectedOutput": t.expected_output, "description": t.description} for t in c.test_cases] if c.test_cases else []
            }
        }

@router.post("/diagnostic")
async def diagnostic_assessment(
    req: DiagnosticRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Evaluates 3 multiple choice answers and sets a baseline Elo rating.
    """
    correct = 0
    # Dummy logic for MVP: just assume answers matching 'a' are correct
    for ans in req.answers:
        if ans.answer.lower() == 'a':
            correct += 1
            
    base_elo = 800
    if correct == 1:
        base_elo = 1000
    elif correct == 2:
        base_elo = 1200
    elif correct == 3:
        base_elo = 1500
        
    if current_user.profile:
        current_user.profile.rank_rating = base_elo
        await db.commit()
        
    return {"status": "SUCCESS", "new_elo": base_elo}

@router.post("/interview")
async def start_interview_mode(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generates a private 45-minute timed interview contest for the user.
    """
    now = datetime.utcnow()
    end_time = now + timedelta(minutes=45)
    
    contest = Contest(
        title=f"Mock Interview - {current_user.username}",
        description="A private 45-minute timed interview session with 2 challenges.",
        start_time=now,
        end_time=end_time,
        status="active"
    )
    db.add(contest)
    await db.commit()
    await db.refresh(contest)
    
    participant = ContestParticipant(
        contest_id=contest.id,
        user_id=current_user.id
    )
    db.add(participant)
    await db.commit()
    
    return {
        "status": "SUCCESS", 
        "contest_id": str(contest.id),
        "message": "Interview session started. Good luck!",
        "end_time": end_time
    }
