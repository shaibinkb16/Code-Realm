from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone
from typing import Optional

from app.core.database import get_db
from app.models.user import User, UserProfile
from app.models.challenge import Challenge
from app.api.deps import get_current_user
from app.services.reward_service import reward_service
from app.services.game_service import game_service
from app.services.mastery_service import mastery_service
from app.services.mission_service import mission_service

router = APIRouter()

HQ_TIERS = [
    {"name": "Room", "buildings": 0, "cost": 0, "unlocks": None},
    {"name": "Office", "buildings": 1, "cost": 1000, "unlocks": "Variables Lab"},
    {"name": "Studio", "buildings": 2, "cost": 2000, "unlocks": "Loop Citadel"},
    {"name": "Developer HQ", "buildings": 3, "cost": 3500, "unlocks": "List Vault"},
    {"name": "AI Laboratory", "buildings": 4, "cost": 6000, "unlocks": "AI Tutor Room"},
    {"name": "Tech Empire", "buildings": 5, "cost": 10000, "unlocks": "Graduation Hall"},
]

PET_STAGES = ["Baby", "Junior", "Advanced", "Master", "Legend Dragon"]

def update_user_streak(profile: UserProfile):
    """Calculates and updates consecutive daily active coding streak."""
    now = datetime.now(timezone.utc)
    if profile.last_activity_date:
        last_date = profile.last_activity_date.date()
        today = now.date()
        diff_days = (today - last_date).days
        if diff_days == 1:
            profile.streak += 1
            profile.last_activity_date = now
        elif diff_days > 1:
            profile.streak = 1
            profile.last_activity_date = now
    else:
        profile.streak = 1
        profile.last_activity_date = now

from pydantic import BaseModel

class SaveProgressRequest(BaseModel):
    """
    Marks a node complete.

    Note there are deliberately no xp/coins/stars fields: this endpoint used to
    accept those from the client and add them straight to the profile, which let
    a modified client award itself arbitrary progress. Amounts are now derived
    server-side from the node's difficulty by RewardService.
    """
    node_id: str
    difficulty: Optional[str] = None  # advisory only; verified against the DB below


@router.get("/profile")
async def get_user_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Fetches user profile and processes daily streak."""
    if current_user.profile:
        update_user_streak(current_user.profile)
        await db.commit()
    return current_user


@router.get("/mastery")
async def get_skill_mastery(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Per-language and per-challenge-type skill breakdown, e.g.:
        Python        ███████░░░ 72%
        Bug Hunting   █████████░ 91%

    Backed by user_language_mastery / user_topic_mastery, populated on every
    graded submission by MasteryService (see api/v1/execution.py) — previously
    these tables existed in the schema but nothing ever wrote to them, so this
    endpoint would have returned nothing.
    """
    breakdown = await mastery_service.get_skill_breakdown(db, current_user.id)
    return {"status": "SUCCESS", **breakdown}


@router.get("/daily-mission")
async def get_daily_mission(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Today's checklist, computed live from real submission/reward history —
    not a stored, independently-toggled state that can drift from what the
    user actually did.
    """
    if not current_user.profile:
        raise HTTPException(status_code=400, detail="Profile not found")
    status_data = await mission_service.get_status(db, current_user.id, current_user.profile)
    return {"status": "SUCCESS", **status_data}


@router.post("/daily-mission/claim")
async def claim_daily_mission(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Re-verifies completion server-side before granting the bonus — the
    frontend's own view of "all_completed" is never trusted as authorization.
    """
    if not current_user.profile:
        raise HTTPException(status_code=400, detail="Profile not found")
    result = await mission_service.claim(db, current_user.id, current_user.profile)
    await db.commit()
    return {"status": "SUCCESS", **result}


@router.get("/weekly-mission")
async def get_weekly_mission(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """This week's checklist (Monday-Monday UTC) — same real-data-computed pattern as /daily-mission."""
    if not current_user.profile:
        raise HTTPException(status_code=400, detail="Profile not found")
    status_data = await mission_service.get_status(db, current_user.id, current_user.profile, period="weekly")
    return {"status": "SUCCESS", **status_data}


@router.post("/weekly-mission/claim")
async def claim_weekly_mission(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not current_user.profile:
        raise HTTPException(status_code=400, detail="Profile not found")
    result = await mission_service.claim(db, current_user.id, current_user.profile, period="weekly")
    await db.commit()
    return {"status": "SUCCESS", **result}


@router.get("/achievements")
async def get_achievements(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Server-authoritative achievement list with real progress/unlocked state.
    Replaces the frontend's previous computeAchievements(), which derived its
    own separate 10-achievement list from local profile state with no backend
    record — a user could see "unlocked" client-side for something the server
    never actually granted XP/coins for.
    """
    if not current_user.profile:
        raise HTTPException(status_code=400, detail="Profile not found")
    achievements = await game_service.get_achievement_status(db, current_user.id, current_user.profile)
    return {"status": "SUCCESS", "achievements": achievements}


from sqlalchemy.orm.attributes import flag_modified

@router.post("/progress")
async def save_user_progress(
    req: SaveProgressRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Saves completed node ID, stars, XP, and coins directly to PostgreSQL database.
    Ensures player progression is permanently preserved across devices & logins.
    """
    profile = current_user.profile
    if not profile:
        raise HTTPException(status_code=400, detail="Profile not found")

    # Trust the database's difficulty for this node, not the request body.
    from sqlalchemy import select
    res = await db.execute(
        select(Challenge).where(Challenge.node_id == req.node_id).limit(1)
    )
    challenge = res.scalars().first()
    difficulty = challenge.difficulty if challenge else req.difficulty

    update_user_streak(profile)

    # Grants exactly once per (user, node): replaying this call returns the
    # original amounts instead of topping the balance up again.
    reward = await reward_service.grant(
        db,
        user_id=current_user.id,
        profile=profile,
        reason="node_completed",
        reference_id=req.node_id,
        difficulty=difficulty,
        won=True,
        apply_rating=False,  # rating is owned by /execute/submit, not this path
    )

    c_ids = list(profile.completed_node_ids or [])
    if req.node_id not in c_ids:
        c_ids.append(req.node_id)
        profile.completed_node_ids = c_ids

    n_stars = dict(profile.node_stars or {})
    existing = n_stars.get(req.node_id, 0)
    n_stars[req.node_id] = max(existing, reward.stars or existing)
    profile.node_stars = n_stars

    flag_modified(profile, "completed_node_ids")
    flag_modified(profile, "node_stars")

    unlocked = await game_service.evaluate_achievements(
        db, current_user.id, profile, "first_challenge_completed"
    )

    await db.commit()

    return {
        "status": "SUCCESS",
        "completed_node_ids": profile.completed_node_ids,
        "node_stars": profile.node_stars,
        "xp": profile.xp,
        "level": profile.level,
        "coins": profile.coins,
        "stars": profile.stars,
        "streak": profile.streak,
        "awarded": {
            "granted": reward.granted,
            "xp": reward.xp,
            "coins": reward.coins,
            "stars": reward.stars,
            "leveled_up": reward.leveled_up,
        },
        "unlocked_achievements": unlocked,
    }

@router.post("/hq/upgrade")
async def upgrade_hq(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upgrades Developer HQ tier in PostgreSQL DB."""
    profile = current_user.profile
    if not profile:
        raise HTTPException(status_code=400, detail="Profile not found")

    current_idx = 0
    for idx, tier in enumerate(HQ_TIERS):
        if tier["name"] == profile.hq_level:
            current_idx = idx
            break

    if current_idx >= len(HQ_TIERS) - 1:
        raise HTTPException(status_code=400, detail="Max HQ tier reached")

    next_tier = HQ_TIERS[current_idx + 1]
    if profile.coins < next_tier["cost"]:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough coins. Required: {next_tier['cost']}, available: {profile.coins}"
        )

    profile.coins -= next_tier["cost"]
    profile.hq_level = next_tier["name"]
    await db.commit()

    return {
        "message": f"HQ upgraded to {next_tier['name']}",
        "coins": profile.coins,
        "hq_level": profile.hq_level,
        "unlocked_building": next_tier["unlocks"]
    }

@router.post("/pet/upgrade")
async def upgrade_pet(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Evolves pet companion stage and level in PostgreSQL DB."""
    profile = current_user.profile
    if not profile:
        raise HTTPException(status_code=400, detail="Profile not found")

    current_idx = PET_STAGES.index(profile.pet_stage) if profile.pet_stage in PET_STAGES else 0
    if current_idx >= len(PET_STAGES) - 1:
        raise HTTPException(status_code=400, detail="Pet companion reached maximum evolution (Legend Dragon)")

    cost = 500
    if profile.coins < cost:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough coins. Required: {cost}, available: {profile.coins}"
        )

    profile.coins -= cost
    profile.pet_stage = PET_STAGES[current_idx + 1]
    profile.pet_level += 1
    await db.commit()

    return {
        "message": f"Pet evolved to {profile.pet_stage}",
        "coins": profile.coins,
        "pet_stage": profile.pet_stage,
        "pet_level": profile.pet_level
    }

@router.post("/hq/claim-passive")
async def claim_passive_income(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Claims daily passive income from HQ buildings into PostgreSQL DB."""
    profile = current_user.profile
    if not profile:
        raise HTTPException(status_code=400, detail="Profile not found")

    passive_rates = {
        'Room': 0,
        'Office': 50,
        'Studio': 130,
        'Developer HQ': 250,
        'AI Laboratory': 450,
        'Tech Empire': 750
    }
    amount = passive_rates.get(profile.hq_level, 0)
    profile.coins += amount
    await db.commit()

    return {
        "message": f"Claimed +{amount} daily passive coins!",
        "coins": profile.coins,
        "amount": amount
    }

from pydantic import BaseModel, Field
from typing import Optional
from app.models.feedback import UserFeedback

class SubmitFeedbackRequest(BaseModel):
    category: str = Field(default="general", description="Category: bug, feature, general, content")
    rating: int = Field(default=5, ge=1, le=5)
    message: str = Field(..., min_length=3, max_length=2000)

@router.post("/feedback")
async def submit_user_feedback(
    req: SubmitFeedbackRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Submits user feedback, bug reports, or app improvement suggestions to PostgreSQL DB."""
    feedback_entry = UserFeedback(
        user_id=current_user.id,
        category=req.category,
        rating=req.rating,
        message=req.message.strip()
    )
    db.add(feedback_entry)
    await db.commit()

    return {
        "status": "SUCCESS",
        "message": "Thank you for your feedback! Your feedback helps make CODE REALM better."
    }

@router.get("/feedback/my")
async def get_my_feedback(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves all feedback and bug reports submitted by current user with admin resolution status."""
    from sqlalchemy import select
    stmt = select(UserFeedback).where(UserFeedback.user_id == current_user.id).order_by(UserFeedback.created_at.desc())
    res = await db.execute(stmt)
    feedbacks = res.scalars().all()

    return {
        "status": "SUCCESS",
        "feedback": [
            {
                "id": str(f.id),
                "category": f.category,
                "rating": f.rating,
                "message": f.message,
                "status": f.status,
                "admin_notes": f.admin_notes,
                "resolved_at": f.resolved_at.isoformat() if f.resolved_at else None,
                "created_at": f.created_at.isoformat()
            } for f in feedbacks
        ]
    }
