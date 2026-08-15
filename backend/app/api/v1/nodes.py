from fastapi import APIRouter, Query, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user, get_optional_user
from app.models.user import User
from app.services.assignment_service import AssignmentService

router = APIRouter()

class DraftSaveRequest(BaseModel):
    code: str

@router.get("/{node_id}/challenge")
async def get_node_challenge(
    node_id: str,
    node_title: str = Query(default="Unknown Node"),
    realm_name: str = Query(default="Code Realm"),
    node_type: str = Query(default="challenge"),
    skill_rating: int = Query(default=905),
    target_language: str = Query(default="python"),
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Resource-Oriented Endpoint (Section 20):
    Returns assigned challenge & saved code draft for current user and map node.
    """
    service = AssignmentService(db)
    user_id = current_user.id if current_user else None

    if current_user:
        return await service.get_or_assign_node_challenge(
            user_id=current_user.id,
            node_id=node_id,
            node_title=node_title,
            realm_name=realm_name,
            node_type=node_type,
            skill_rating=skill_rating,
            target_language=target_language
        )
    else:
        # Unauthenticated preview mode
        from app.services.question_bank_service import QuestionBankService
        qset = await QuestionBankService(db).get_or_create_question_set(
            node_id=node_id,
            node_title=node_title,
            realm_name=realm_name,
            node_type=node_type,
            skill_rating=skill_rating,
            target_language=target_language
        )
        primary = qset.challenges[0]
        return {
            "status": "SUCCESS",
            "challenge": QuestionBankService.format_challenge_public(primary),
            "savedCode": primary.initial_code,
            "isCompleted": False
        }


@router.patch("/{node_id}/challenge/draft")
async def save_challenge_draft(
    node_id: str,
    req: DraftSaveRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Saves user code draft to UserNodeAssignment in PostgreSQL.
    IDOR Protection (Section 24): Authority is derived strictly from JWT current_user.id.
    """
    service = AssignmentService(db)
    success = await service.save_code_draft(user_id=current_user.id, node_id=node_id, code=req.code)
    if not success:
        raise HTTPException(status_code=404, detail="No active assignment found for this node.")
    return {"status": "SUCCESS", "message": "Draft saved successfully."}


@router.post("/{node_id}/challenge/swap")
async def swap_node_challenge(
    node_id: str,
    target_language: str = Query(default="python"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Swaps active challenge assignment to next alternate question in Question Bank with ZERO LLM calls.
    """
    service = AssignmentService(db)
    return await service.swap_assignment(
        user_id=current_user.id,
        node_id=node_id,
        target_language=target_language
    )
