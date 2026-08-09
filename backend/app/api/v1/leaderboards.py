from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from app.core.database import get_db
from app.models.user import User, UserProfile
from pydantic import BaseModel

router = APIRouter()

class LeaderboardUserDTO(BaseModel):
    rank: int
    username: str
    avatar: str
    rating: int
    xp: int
    league: str

@router.get("/global", response_model=List[LeaderboardUserDTO])
async def get_global_leaderboard(db: AsyncSession = Depends(get_db)):
    """Returns top ranked global players ordered by ELO rating."""
    result = await db.execute(
        select(User, UserProfile)
        .join(UserProfile, User.id == UserProfile.user_id)
        .order_by(UserProfile.rank_rating.desc())
        .limit(50)
    )
    rows = result.all()

    entries = []
    for idx, (user, profile) in enumerate(rows, start=1):
        entries.append(
            LeaderboardUserDTO(
                rank=idx,
                username=user.username,
                avatar=profile.avatar,
                rating=profile.rank_rating,
                xp=profile.xp,
                league=profile.rank
            )
        )
    return entries
