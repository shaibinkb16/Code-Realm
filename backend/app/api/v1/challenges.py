from fastapi import APIRouter, Query, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import get_db
from app.models.challenge import MapNode, Challenge, TestCase
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
    target_language: str = Query(default="python", description="Target programming language"),
    db: AsyncSession = Depends(get_db),
):
    """
    Calls Gemini to generate a complete coding challenge tailored to
    the player's skill rating and the current map node context.
    Or returns the existing challenge if one was already generated and saved.
    Returns: { status, challenge: { title, description, storyContext, initialCode, testCases, hints, ... } }
    """
    # 1. Check if node exists and has a challenge
    node = await db.get(MapNode, node_id, options=[selectinload(MapNode.challenge).selectinload(Challenge.test_cases)])
    
    if node and node.challenge and node.challenge.language == target_language.lower():
        # We already generated this challenge in the correct language! Reuse it.
        c = node.challenge
        return {
            "status": "SUCCESS",
            "challenge": {
                "title": c.title,
                "type": c.type,
                "difficulty": c.difficulty,
                "description": c.description,
                "storyContext": c.story_context,
                "initialCode": c.initial_code,
                "language": c.language,
                "testCases": [
                    {
                        "id": str(t.id),
                        "input": t.input_data,
                        "expectedOutput": t.expected_output,
                        "description": t.description
                    } for t in c.test_cases
                ],
                "hints": c.hints,
                "explanation": c.explanation,
                "xpReward": c.xp_reward,
                "coinReward": c.coin_reward
            }
        }

    # 2. Generate new challenge via AI Mentor
    result = await ai_mentor_service.generate_challenge(
        node_title=node_title,
        realm_name=realm_name,
        node_type=node_type,
        skill_rating=skill_rating,
        target_language=target_language,
    )

    # 3. Save to database if generation was successful
    if result["status"] == "SUCCESS":
        gen_c = result["challenge"]
        new_challenge_id = str(uuid.uuid4())
        
        # Create Challenge
        db_challenge = Challenge(
            id=new_challenge_id,
            title=gen_c.get("title", "Untitled Challenge"),
            type=gen_c.get("type", "puzzle"),
            difficulty=gen_c.get("difficulty", "Medium"),
            description=gen_c.get("description", ""),
            story_context=gen_c.get("storyContext", ""),
            initial_code=gen_c.get("initialCode", ""),
            language=gen_c.get("language", "python"),
            xp_reward=gen_c.get("xpReward", 100),
            coin_reward=gen_c.get("coinReward", 50),
            explanation=gen_c.get("explanation", ""),
            tags=[node_title, realm_name],
            hints=gen_c.get("hints", []),
            generated_by="ai",
            validation_status="pending",
        )
        db.add(db_challenge)
        
        # Create Test Cases
        for tc in gen_c.get("testCases", []):
            db_tc = TestCase(
                challenge_id=new_challenge_id,
                input_data=tc.get("input", ""),
                expected_output=tc.get("expectedOutput", ""),
                description=tc.get("description", ""),
                is_hidden=False
            )
            db.add(db_tc)
            
        # Try to link to the MapNode if it exists
        if node:
            node.challenge_id = new_challenge_id
            
        await db.commit()

    return result


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
