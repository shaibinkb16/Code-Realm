from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.services.ai_mentor_service import ai_mentor_service

router = APIRouter()


# ─────────────────────────────────────────────────────────
# GET /challenges/generate
# Gemini generates a fresh, dynamic challenge for this node
# ─────────────────────────────────────────────────────────
@router.get("/generate")
async def generate_challenge(
    node_id: str = Query(..., description="The map node ID (e.g. node-loop-1)"),
    node_title: str = Query(default="Unknown Node", description="Human-readable node name"),
    realm_name: str = Query(default="Code Realm", description="The realm the node belongs to"),
    node_type: str = Query(default="challenge", description="Node type: challenge or boss"),
    skill_rating: int = Query(default=905, description="Player skill rating (0-2500)"),
):
    """
    Calls Gemini to generate a complete coding challenge tailored to
    the player's skill rating and the current map node context.
    Returns: { status, challenge: { title, description, storyContext, initialCode, testCases, hints, ... } }
    """
    return await ai_mentor_service.generate_challenge(
        node_title=node_title,
        realm_name=realm_name,
        node_type=node_type,
        skill_rating=skill_rating,
    )


# ─────────────────────────────────────────────────────────
# POST /challenges/feedback
# Gemini reviews user's code after execution and gives feedback
# ─────────────────────────────────────────────────────────
class FeedbackRequest(BaseModel):
    code: str
    challenge_title: str
    challenge_description: str
    test_results: List[Dict[str, Any]]
    skill_rating: int = 905


@router.post("/feedback")
async def get_challenge_feedback(req: FeedbackRequest):
    """
    After code execution, returns Gemini-generated personalized feedback
    on the user's solution — what they did right, what to improve.
    """
    return await ai_mentor_service.generate_feedback(
        code=req.code,
        challenge_title=req.challenge_title,
        challenge_description=req.challenge_description,
        test_results=req.test_results,
        skill_rating=req.skill_rating,
    )
