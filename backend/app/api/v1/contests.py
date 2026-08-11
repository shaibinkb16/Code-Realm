from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from datetime import datetime
from pydantic import BaseModel
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.contest import Contest, ContestParticipant, ContestSubmission
from app.services.execution_service import execution_service
from app.schemas.execution import CodeExecutionRequest
from app.services.game_service import game_service

router = APIRouter()

class ContestResponse(BaseModel):
    id: str
    title: str
    description: str
    start_time: datetime
    end_time: datetime
    status: str

@router.get("", response_model=List[ContestResponse])
async def get_contests(db: AsyncSession = Depends(get_db)):
    """List all active and upcoming contests."""
    res = await db.execute(
        select(Contest).order_by(Contest.start_time.asc())
    )
    return [
        {
            "id": str(c.id),
            "title": c.title,
            "description": c.description or "",
            "start_time": c.start_time,
            "end_time": c.end_time,
            "status": c.status
        }
        for c in res.scalars().all()
    ]

@router.post("/{contest_id}/join")
async def join_contest(
    contest_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Register for a contest."""
    contest = await db.get(Contest, contest_id)
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")
        
    res = await db.execute(
        select(ContestParticipant).where(
            ContestParticipant.contest_id == contest.id,
            ContestParticipant.user_id == current_user.id
        )
    )
    if res.scalars().first():
        return {"status": "SUCCESS", "message": "Already registered"}
        
    participant = ContestParticipant(
        contest_id=contest.id,
        user_id=current_user.id
    )
    db.add(participant)
    await db.commit()
    return {"status": "SUCCESS", "message": "Registered successfully"}

@router.post("/{contest_id}/submit")
async def submit_contest_solution(
    contest_id: str,
    req: CodeExecutionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Submit code specifically for a contest."""
    contest = await db.get(Contest, contest_id)
    if not contest or contest.status != "active":
        raise HTTPException(status_code=400, detail="Contest is not active")
        
    # Check registration
    res = await db.execute(
        select(ContestParticipant).where(
            ContestParticipant.contest_id == contest.id,
            ContestParticipant.user_id == current_user.id
        )
    )
    participant = res.scalars().first()
    if not participant:
        raise HTTPException(status_code=403, detail="You must register first")

    # Anti-cheat check: execution time/time to solve is simulated
    # MVP: We assume the frontend passed a time_to_solve metric (not in req right now, we'll dummy it)
    time_to_solve_seconds = 120 # Mocked for MVP
    if time_to_solve_seconds < 10:
        raise HTTPException(status_code=400, detail="Suspiciously fast submission (Anti-Cheat)")

    test_cases = [
        {
            "id": tc.id,
            "description": tc.description,
            "input": tc.input or "",
            "expected_output": tc.expected_output,
        }
        for tc in req.test_cases
    ]
    
    # 1. Run the code
    result = await execution_service.execute_python_code(req.code, test_cases)
    
    # 2. Record submission
    submission = ContestSubmission(
        contest_id=contest.id,
        user_id=current_user.id,
        challenge_id=req.challenge_id or "unknown",
        code=req.code,
        passed=result.all_passed,
        execution_time_ms=result.execution_time_ms,
        time_to_solve_seconds=time_to_solve_seconds
    )
    db.add(submission)
    
    if result.all_passed:
        # Update participant score (e.g. +100 per solve)
        participant.score += 100
        
    await db.commit()
    
    return result
