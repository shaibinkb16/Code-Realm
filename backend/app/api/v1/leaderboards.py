from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from app.core.database import get_db
from app.models.user import User, UserProfile
from app.models.learning import UserLanguageMastery, UserTopicMastery
from app.models.submission import CodeSubmission
from app.core.redis import redis_manager
import json
from pydantic import BaseModel

router = APIRouter()

class LeaderboardUserDTO(BaseModel):
    rank: int
    username: str
    full_name: Optional[str] = None
    avatar: str
    rating: int
    xp: int
    league: str

@router.get("/global", response_model=List[LeaderboardUserDTO])
async def get_global_leaderboard(
    language_id: Optional[str] = None,
    topic_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Returns top ranked global players ordered by ELO rating."""
    
    # Try cache first
    cache_key = f"leaderboard:global:lang_{language_id}:topic_{topic_id}"
    cached_data = await redis_manager.get(cache_key)
    if cached_data:
        try:
            return json.loads(cached_data)
        except Exception:
            pass
            
    query = (
        select(User, UserProfile)
        .join(UserProfile, User.id == UserProfile.user_id)
        .where(
            User.role.notin_(["admin", "super_admin"]) &
            ~User.username.ilike("admin%") &
            ~User.email.ilike("%admin%") &
            ~User.email.ilike("%@test.com") &
            ~User.email.ilike("%@coderealm.test") &
            ~User.username.ilike("usera_%") &
            ~User.username.ilike("userb_%") &
            ~User.username.ilike("user_a_%") &
            ~User.username.ilike("user_b_%") &
            ~User.username.ilike("std_%") &
            ~User.username.ilike("explorer_%")
        )
    )
    
    if language_id:
        query = query.join(UserLanguageMastery, User.id == UserLanguageMastery.user_id)
        query = query.where(UserLanguageMastery.language_id == language_id)
        query = query.order_by(UserLanguageMastery.mastery_percentage.desc())
    elif topic_id:
        query = query.join(UserTopicMastery, User.id == UserTopicMastery.user_id)
        query = query.where(UserTopicMastery.topic_id == topic_id)
        query = query.order_by(UserTopicMastery.mastery_percentage.desc())
    else:
        query = query.order_by(UserProfile.rank_rating.desc())
        
    query = query.limit(50)
    result = await db.execute(query)
    rows = result.all()

    entries = []
    for idx, (user, profile) in enumerate(rows, start=1):
        # We use profile.rank_rating if it's a global leaderboard, otherwise we would use the specific proficiency
        entries.append(
            LeaderboardUserDTO(
                rank=idx,
                username=user.full_name or user.username,
                full_name=user.full_name,
                avatar=profile.avatar,
                rating=profile.rank_rating,
                xp=profile.xp,
                league=profile.rank
            ).model_dump()
        )
        
    await redis_manager.set(cache_key, json.dumps(entries), ttl=300) # Cache for 5 minutes
    return entries


# ─────────────────────────────────────────────────────────
# GET /leaderboards/ghost-pace
#
# Backs the Code Duel "ghost race" — instead of a `Math.random()`-driven fake
# opponent, the duel races the player against a real completion-time signal
# from actual players at a similar skill rating. Built from
# code_submissions.solve_time_seconds (only populated by callers that measure
# it, e.g. CodeDuel's countdown timer) rather than from execution_time_ms,
# which is code runtime, not how long the user took to solve the problem.
# ─────────────────────────────────────────────────────────
class GhostPaceDTO(BaseModel):
    median_seconds: int
    sample_size: int
    rating_band: str


@router.get("/ghost-pace", response_model=GhostPaceDTO)
async def get_ghost_pace(
    rating: int = 1000,
    band: int = 200,
    db: AsyncSession = Depends(get_db)
):
    """
    Median real solve time (seconds) among passed submissions from users
    within `rating` ± `band`. sample_size=0 means no real data exists yet at
    this band — callers must treat that as "no ghost available" rather than
    inventing a number, so the UI can be honest about a thin sample.
    """
    query = (
        select(CodeSubmission.solve_time_seconds)
        .join(UserProfile, CodeSubmission.user_id == UserProfile.user_id)
        .where(
            CodeSubmission.status == "passed",
            CodeSubmission.solve_time_seconds.isnot(None),
            UserProfile.rank_rating.between(rating - band, rating + band),
        )
        .order_by(CodeSubmission.solve_time_seconds.asc())
        .limit(500)
    )
    result = await db.execute(query)
    times = sorted(r[0] for r in result.all())

    if not times:
        return GhostPaceDTO(median_seconds=0, sample_size=0, rating_band=f"{rating}±{band}")

    median = times[len(times) // 2]
    return GhostPaceDTO(median_seconds=median, sample_size=len(times), rating_band=f"{rating}±{band}")
