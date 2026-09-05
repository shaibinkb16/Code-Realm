"""
Centralized, server-authoritative reward granting.

Before this service, XP/coin/star amounts were computed in three different
places with different hardcoded numbers (execution_service, api/v1/execution,
api/v1/user), and /user/progress accepted the amounts straight from the client
request body. Every grant now goes through grant() here, which:

  1. Derives the amounts server-side from difficulty — never from client input.
  2. Refuses to award twice for the same logical action, enforced by a unique
     index on reward_grants.idempotency_key rather than a racy read-then-write.
  3. Records what was granted and why, so balances are explainable after the fact.
"""
import hashlib
import logging
from dataclasses import dataclass, field

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.gamification import RewardGrant
from app.models.user import UserProfile
from app.services.game_service import game_service

logger = logging.getLogger(__name__)


# Server-side reward table. Difficulty is the only input a client can influence,
# and it comes from the persisted Challenge row, not the request body.
DIFFICULTY_REWARDS: dict[str, dict[str, int]] = {
    "easy":   {"xp": 100, "coins": 40,  "stars": 3, "rating": 800},
    "medium": {"xp": 200, "coins": 80,  "stars": 3, "rating": 1200},
    "hard":   {"xp": 350, "coins": 150, "stars": 3, "rating": 1600},
    "expert": {"xp": 500, "coins": 220, "stars": 3, "rating": 2000},
}
DEFAULT_DIFFICULTY = "medium"

# Partial credit for a failed attempt: enough to acknowledge effort, small
# enough that farming failures is never better than solving something.
CONSOLATION_XP = 15
CONSOLATION_COINS = 5


@dataclass
class RewardResult:
    """What actually happened, so callers can render honest feedback."""
    granted: bool                      # False => idempotent replay, nothing changed
    xp: int = 0
    coins: int = 0
    stars: int = 0
    rating_delta: int = 0
    new_level: int = 0
    leveled_up: bool = False
    new_rating: int = 0
    new_rank: str = ""
    reason: str = ""
    unlocked_achievements: list[str] = field(default_factory=list)


def build_idempotency_key(user_id, reason: str, reference_id: str | None) -> str:
    """
    Stable key for one logical reward-earning action.

    Deliberately excludes any timestamp: two clicks on the same Submit button
    for the same challenge must collide, which is the whole point.
    """
    raw = f"{user_id}:{reason}:{reference_id or '-'}"
    return hashlib.sha256(raw.encode()).hexdigest()[:64]


def resolve_difficulty(difficulty: str | None) -> str:
    if not difficulty:
        return DEFAULT_DIFFICULTY
    key = difficulty.strip().lower()
    return key if key in DIFFICULTY_REWARDS else DEFAULT_DIFFICULTY


def rewards_for(difficulty: str | None) -> dict[str, int]:
    return DIFFICULTY_REWARDS[resolve_difficulty(difficulty)]


class RewardService:
    async def already_granted(
        self, db: AsyncSession, idempotency_key: str
    ) -> RewardGrant | None:
        res = await db.execute(
            select(RewardGrant).where(RewardGrant.idempotency_key == idempotency_key)
        )
        return res.scalars().first()

    async def grant(
        self,
        db: AsyncSession,
        *,
        user_id,
        profile: UserProfile,
        reason: str,
        reference_id: str | None,
        difficulty: str | None = None,
        won: bool = True,
        apply_rating: bool = True,
        idempotency_key: str | None = None,
    ) -> RewardResult:
        """
        Grant rewards for one action, exactly once.

        Does NOT commit — the caller owns the transaction so a submission
        record, mistake log, and reward grant all land together or not at all.
        """
        key = idempotency_key or build_idempotency_key(user_id, reason, reference_id)

        existing = await self.already_granted(db, key)
        if existing:
            # Replay of an action we've already paid out for. Report the
            # original amounts so the UI stays consistent, but change nothing.
            return RewardResult(
                granted=False,
                xp=existing.xp_granted,
                coins=existing.coins_granted,
                stars=existing.stars_granted,
                rating_delta=existing.rating_delta,
                new_level=profile.level,
                new_rating=profile.rank_rating,
                new_rank=profile.rank,
                reason=f"already_granted:{existing.reason}",
            )

        table = rewards_for(difficulty)

        if won:
            xp, coins, stars = table["xp"], table["coins"], table["stars"]
        else:
            xp, coins, stars = CONSOLATION_XP, CONSOLATION_COINS, 0

        rating_delta = 0
        old_rating = profile.rank_rating
        if apply_rating:
            rating_delta = game_service.calculate_elo_change(
                old_rating, table["rating"], won
            )

        # Claim the idempotency slot BEFORE touching the profile at all, and
        # do it inside a SAVEPOINT (begin_nested), not the top-level session.
        # Ordering matters: if this insert loses a concurrent race on
        # idempotency_key, nothing about `profile` has been mutated yet, so
        # there is nothing to undo. A bare `db.rollback()` here (the previous
        # version of this method) would instead roll back the *entire*
        # session — expiring every ORM object already loaded for this request
        # (including `profile` and `challenge` in the caller) and crashing the
        # next attribute access with SQLAlchemy's MissingGreenlet, the same
        # failure class fixed in execution.py's placeholder-Challenge path.
        try:
            async with db.begin_nested():
                db.add(
                    RewardGrant(
                        user_id=user_id,
                        idempotency_key=key,
                        reason=reason,
                        reference_id=reference_id,
                        xp_granted=xp,
                        coins_granted=coins,
                        stars_granted=stars,
                        rating_delta=rating_delta,
                    )
                )
                await db.flush()
        except IntegrityError:
            logger.info(
                "Concurrent duplicate reward grant blocked (reason=%s ref=%s)",
                reason,
                reference_id,
            )
            return RewardResult(
                granted=False,
                new_level=profile.level,
                new_rating=profile.rank_rating,
                new_rank=profile.rank,
                reason="duplicate_blocked",
            )

        # Ledger entry is secured — now safe to apply the reward.
        level_info = game_service.calculate_level_and_xp(profile, xp)
        profile.level = level_info["level"]
        profile.xp = level_info["xp"]
        profile.next_level_xp = level_info["next_level_xp"]
        profile.coins = (profile.coins or 0) + coins
        profile.stars = (profile.stars or 0) + stars

        if rating_delta:
            profile.rank_rating = max(0, old_rating + rating_delta)
            profile.rank = game_service.get_league_from_rating(profile.rank_rating)

        return RewardResult(
            granted=True,
            xp=xp,
            coins=coins,
            stars=stars,
            rating_delta=rating_delta,
            new_level=profile.level,
            leveled_up=level_info["leveled_up"],
            new_rating=profile.rank_rating,
            new_rank=profile.rank,
            reason=reason,
        )

    async def grant_fixed(
        self,
        db: AsyncSession,
        *,
        user_id,
        profile: UserProfile,
        reason: str,
        reference_id: str | None,
        xp: int,
        coins: int,
        stars: int = 0,
        idempotency_key: str | None = None,
    ) -> RewardResult:
        """
        Same idempotency-ledger mechanics as grant(), but for a caller-supplied
        flat bonus (e.g. a daily mission reward) instead of a difficulty-derived
        amount. `xp`/`coins`/`stars` must be server-side constants — this must
        never be reachable with client-supplied amounts, since nothing here
        re-validates them against a difficulty table.
        """
        key = idempotency_key or build_idempotency_key(user_id, reason, reference_id)

        existing = await self.already_granted(db, key)
        if existing:
            return RewardResult(
                granted=False,
                xp=existing.xp_granted,
                coins=existing.coins_granted,
                stars=existing.stars_granted,
                new_level=profile.level,
                new_rating=profile.rank_rating,
                new_rank=profile.rank,
                reason=f"already_granted:{existing.reason}",
            )

        # Same ordering fix as grant(): claim the ledger row in a SAVEPOINT
        # before touching `profile`, so a concurrent-duplicate race has
        # nothing to unwind and never needs a full-session rollback.
        try:
            async with db.begin_nested():
                db.add(
                    RewardGrant(
                        user_id=user_id,
                        idempotency_key=key,
                        reason=reason,
                        reference_id=reference_id,
                        xp_granted=xp,
                        coins_granted=coins,
                        stars_granted=stars,
                        rating_delta=0,
                    )
                )
                await db.flush()
        except IntegrityError:
            logger.info("Concurrent duplicate fixed grant blocked (reason=%s ref=%s)", reason, reference_id)
            return RewardResult(
                granted=False,
                new_level=profile.level,
                new_rating=profile.rank_rating,
                new_rank=profile.rank,
                reason="duplicate_blocked",
            )

        level_info = game_service.calculate_level_and_xp(profile, xp)
        profile.level = level_info["level"]
        profile.xp = level_info["xp"]
        profile.next_level_xp = level_info["next_level_xp"]
        profile.coins = (profile.coins or 0) + coins
        profile.stars = (profile.stars or 0) + stars

        return RewardResult(
            granted=True,
            xp=xp,
            coins=coins,
            stars=stars,
            new_level=profile.level,
            leveled_up=level_info["leveled_up"],
            new_rating=profile.rank_rating,
            new_rank=profile.rank,
            reason=reason,
        )


reward_service = RewardService()
