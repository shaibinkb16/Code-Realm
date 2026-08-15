from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from app.core.database import get_db
from app.models.user import User, UserProfile
from app.models.learning import UserLanguageMastery, UserTopicMastery
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
        query = query.order_by(UserLanguageMastery.proficiency_score.desc())
    elif topic_id:
        query = query.join(UserTopicMastery, User.id == UserTopicMastery.user_id)
        query = query.where(UserTopicMastery.topic_id == topic_id)
        query = query.order_by(UserTopicMastery.proficiency_score.desc())
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
