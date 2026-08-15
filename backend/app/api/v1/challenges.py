from fastapi import APIRouter, Query, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import get_db, get_current_user, get_optional_user
from app.models.user import User
from app.models.challenge import MapNode, Challenge, TestCase, UserNodeAssignment
from app.services.ai_mentor_service import ai_mentor_service

router = APIRouter()


def _format_challenge_dict(c: Challenge) -> dict:
    return {
        "id": c.id,
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
            } for t in (c.test_cases or [])
        ],
        "hints": c.hints or [],
        "explanation": c.explanation or "",
        "xpReward": c.xp_reward,
        "coinReward": c.coin_reward
    }


# ─────────────────────────────────────────────────────────
# GET /challenges/generate
# Retrieves persistent question from PostgreSQL Question Bank
# or batch-generates Primary + Alternates via Gemini 3.6 Flash
# ─────────────────────────────────────────────────────────
@router.get("/generate")
async def generate_challenge(
    node_id: str = Query(..., description="The map node ID (e.g. node-1)"),
    node_title: str = Query(default="Unknown Node", description="Human-readable node name"),
    realm_name: str = Query(default="Code Realm", description="The realm the node belongs to"),
    node_type: str = Query(default="challenge", description="Node type: challenge or boss"),
    skill_rating: int = Query(default=905, description="Player skill rating (0-2500)"),
    target_language: str = Query(default="python", description="Target programming language"),
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    target_lang = target_language.lower()

    # 1. If user is logged in, check existing assignment & saved code draft
    if current_user:
        res_assign = await db.execute(
            select(UserNodeAssignment)
            .options(selectinload(UserNodeAssignment.challenge).selectinload(Challenge.test_cases))
            .where(
                (UserNodeAssignment.user_id == current_user.id) &
                (UserNodeAssignment.node_id == node_id)
            )
        )
        assignment = res_assign.scalars().first()
        if assignment and assignment.challenge and assignment.challenge.language == target_lang:
            c = assignment.challenge
            return {
                "status": "SUCCESS",
                "challenge": _format_challenge_dict(c),
                "savedCode": assignment.saved_code or c.initial_code,
                "isCompleted": assignment.is_completed
            }

    # 2. Check PostgreSQL Question Bank for pre-saved questions for this node_id & language
    res_chals = await db.execute(
        select(Challenge)
        .options(selectinload(Challenge.test_cases))
        .where(
            (Challenge.node_id == node_id) &
            (Challenge.language == target_lang)
        )
        .order_by(Challenge.alternate_index)
    )
    existing_challenges = res_chals.scalars().all()

    if existing_challenges:
        primary_challenge = existing_challenges[0]
        if current_user:
            new_assign = UserNodeAssignment(
                user_id=current_user.id,
                node_id=node_id,
                challenge_id=primary_challenge.id,
                saved_code=primary_challenge.initial_code,
                is_completed=False
            )
            db.add(new_assign)
            await db.commit()

        return {
            "status": "SUCCESS",
            "challenge": _format_challenge_dict(primary_challenge),
            "savedCode": primary_challenge.initial_code,
            "isCompleted": False
        }

    # 3. No questions in DB: Batch-generate 3 challenges (Primary + 2 Alternates) via Gemini 3.6 Flash
    batch_res = await ai_mentor_service.generate_challenge_batch(
        node_title=node_title,
        realm_name=realm_name,
        node_type=node_type,
        skill_rating=skill_rating,
        target_language=target_lang,
    )

    generated_list = batch_res.get("challenges", [])
    saved_db_challenges = []

    for idx, gen_c in enumerate(generated_list):
        c_id = f"{node_id}-{target_lang}-alt{idx}" if idx > 0 else f"{node_id}-{target_lang}"
        existing_c = await db.get(Challenge, c_id)
        if existing_c:
            c_id = f"{c_id}-{str(uuid.uuid4())[:8]}"

        db_challenge = Challenge(
            id=c_id,
            node_id=node_id,
            realm_id=realm_name,
            alternate_index=idx,
            min_skill_rating=max(100, skill_rating - 200),
            max_skill_rating=skill_rating + 500,
            title=gen_c.get("title", f"{node_title} Trial {idx+1}"),
            type=gen_c.get("type", "puzzle"),
            difficulty=gen_c.get("difficulty", "Medium"),
            description=gen_c.get("description", ""),
            story_context=gen_c.get("storyContext", ""),
            initial_code=gen_c.get("initialCode", ""),
            language=target_lang,
            xp_reward=gen_c.get("xpReward", 100 + (idx * 20)),
            coin_reward=gen_c.get("coinReward", 50 + (idx * 10)),
            explanation=gen_c.get("explanation", ""),
            tags=[node_title, realm_name],
            hints=gen_c.get("hints", []),
            generated_by="ai",
            validation_status="approved",
        )
        db.add(db_challenge)
        await db.flush()

        for tc in gen_c.get("testCases", []):
            db_tc = TestCase(
                challenge_id=c_id,
                input_data=str(tc.get("input", "")),
                expected_output=str(tc.get("expectedOutput", "")),
                description=tc.get("description", ""),
                is_hidden=False
            )
            db.add(db_tc)

        saved_db_challenges.append(db_challenge)

    primary_c = saved_db_challenges[0] if saved_db_challenges else None

    if current_user and primary_c:
        new_assign = UserNodeAssignment(
            user_id=current_user.id,
            node_id=node_id,
            challenge_id=primary_c.id,
            saved_code=primary_c.initial_code,
            is_completed=False
        )
        db.add(new_assign)

    await db.commit()

    # Reload primary challenge with test cases
    res_reloaded = await db.execute(
        select(Challenge).options(selectinload(Challenge.test_cases)).where(Challenge.id == primary_c.id)
    )
    primary_reloaded = res_reloaded.scalars().first()

    return {
        "status": "SUCCESS",
        "challenge": _format_challenge_dict(primary_reloaded),
        "savedCode": primary_reloaded.initial_code,
        "isCompleted": False
    }


# ─────────────────────────────────────────────────────────
# POST /challenges/swap
# Swaps user assignment to the next alternate question in PostgreSQL DB
# ─────────────────────────────────────────────────────────
class SwapRequest(BaseModel):
    node_id: str
    target_language: str = "python"


@router.post("/swap")
async def swap_challenge(
    req: SwapRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    target_lang = req.target_language.lower()

    # 1. Query PostgreSQL Question Bank for available challenges for this node
    res_chals = await db.execute(
        select(Challenge)
        .options(selectinload(Challenge.test_cases))
        .where(
            (Challenge.node_id == req.node_id) &
            (Challenge.language == target_lang)
        )
        .order_by(Challenge.alternate_index)
    )
    all_chals = res_chals.scalars().all()
    if not all_chals:
        raise HTTPException(status_code=404, detail="No challenges found in database for this node.")

    # 2. Get user assignment
    res_assign = await db.execute(
        select(UserNodeAssignment).where(
            (UserNodeAssignment.user_id == current_user.id) &
            (UserNodeAssignment.node_id == req.node_id)
        )
    )
    assignment = res_assign.scalars().first()

    current_idx = 0
    if assignment:
        for idx, c in enumerate(all_chals):
            if c.id == assignment.challenge_id:
                current_idx = idx
                break

        next_idx = (current_idx + 1) % len(all_chals)
        next_challenge = all_chals[next_idx]

        assignment.challenge_id = next_challenge.id
        assignment.saved_code = next_challenge.initial_code
        await db.commit()
    else:
        next_challenge = all_chals[1] if len(all_chals) > 1 else all_chals[0]
        new_assign = UserNodeAssignment(
            user_id=current_user.id,
            node_id=req.node_id,
            challenge_id=next_challenge.id,
            saved_code=next_challenge.initial_code,
            is_completed=False
        )
        db.add(new_assign)
        await db.commit()

    return {
        "status": "SUCCESS",
        "message": f"Swapped to alternate challenge {next_challenge.alternate_index + 1}",
        "challenge": _format_challenge_dict(next_challenge),
        "savedCode": next_challenge.initial_code
    }


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
    return await ai_mentor_service.generate_feedback(
        code=req.code,
        challenge_title=req.challenge_title,
        challenge_description=req.challenge_description,
        test_results=req.test_results,
        skill_rating=req.skill_rating,
    )

