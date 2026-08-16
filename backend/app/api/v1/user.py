from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone

from app.core.database import get_db
from app.models.user import User, UserProfile
from app.api.deps import get_current_user

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
