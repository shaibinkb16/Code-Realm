from datetime import datetime, timedelta
from app.models.user import UserProfile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.gamification import Achievement, UserAchievement

class GameService:
    @staticmethod
    def calculate_level_and_xp(profile: UserProfile, added_xp: int) -> dict:
        """Server-side authoritative calculation of XP and Level promotions."""
        new_xp = profile.xp + added_xp
        current_level = profile.level
        next_xp = profile.next_level_xp
        leveled_up = False

        while new_xp >= next_xp:
            current_level += 1
            next_xp += 1000
            leveled_up = True

        return {
            "level": current_level,
            "xp": new_xp,
            "next_level_xp": next_xp,
            "leveled_up": leveled_up
        }

    # Fraction of the raw Elo penalty actually applied on a loss.
    #
    # This was previously 0.0 (pure positive-sum: rating could only ever rise).
    # A rating that can't fall stops signalling skill once a player plateaus —
    # it becomes a participation counter. A damped penalty keeps wins meaningful
    # while staying gentler than competitive Elo, which is the right balance for
    # a learning product. Set to 0.0 to restore the old positive-sum behavior.
    LOSS_PENALTY_FACTOR = 0.5

    # Never drop a player below this, so a bad run can't undo real progress.
    RATING_FLOOR = 100

    @staticmethod
    def calculate_elo_change(player_rating: int, challenge_rating: int, won: bool, k_factor: int = 32) -> int:
        """
        Calculates the rating change using the Elo rating system.

        Wins always yield at least +1 so effort is never unrewarded. Losses cost
        a damped fraction of the true Elo penalty (see LOSS_PENALTY_FACTOR) and
        are floored so rating cannot collapse.
        """
        # Expected win probability against a challenge of this rating
        expected_score = 1 / (1 + 10 ** ((challenge_rating - player_rating) / 400))
        actual_score = 1 if won else 0

        change = k_factor * (actual_score - expected_score)

        if won:
            return max(1, int(change))  # Always gain at least 1 point for a win

        penalty = int(change * GameService.LOSS_PENALTY_FACTOR)
        # Don't let the penalty push the player under the floor.
        max_drop = max(0, player_rating - GameService.RATING_FLOOR)
        return -min(abs(penalty), max_drop)

    @staticmethod
    def get_league_from_rating(rating: int) -> str:
        """Determines the player's league based on Elo rating."""
        if rating < 800:
            return "Bronze"
        elif rating < 1200:
            return "Silver"
        elif rating < 1600:
            return "Gold"
        elif rating < 2000:
            return "Platinum"
        elif rating < 2400:
            return "Diamond"
        else:
            return "Master"
    @staticmethod
    def update_streak(profile: UserProfile):
        """Updates the user's daily streak based on their last activity."""
        today = datetime.utcnow().date()
        if not profile.last_activity_date:
            profile.streak = 1
            profile.last_activity_date = datetime.utcnow()
            return
            
        last_date = profile.last_activity_date.date()
        if last_date == today:
            return # Already updated today
            
        if last_date == today - timedelta(days=1):
            profile.streak += 1
        else:
            profile.streak = 1 # Streak broken
            
        profile.last_activity_date = datetime.utcnow()

    @staticmethod
    async def evaluate_achievements(db: AsyncSession, user_id: str, profile: UserProfile, event: str) -> list[str]:
        """
        Evaluates the achievement catalog against the user's current state and
        unlocks anything newly earned. Returns the ids unlocked by this call so
        the caller can surface them in the response.

        Achievements are seeded on demand (see ACHIEVEMENT_CATALOG) so a fresh
        database doesn't need a separate seed step to start awarding them.

        Does not commit — the caller owns the transaction.
        """
        unlocked: list[str] = []

        # Which achievements could this event possibly satisfy?
        candidates = [
            a for a in ACHIEVEMENT_CATALOG
            if event in a["events"] and a["predicate"](profile)
        ]
        if not candidates:
            return unlocked

        candidate_ids = [a["id"] for a in candidates]

        res = await db.execute(
            select(UserAchievement.achievement_id).where(
                UserAchievement.user_id == user_id,
                UserAchievement.achievement_id.in_(candidate_ids),
            )
        )
        already_have = set(res.scalars().all())

        for spec in candidates:
            if spec["id"] in already_have:
                continue

            # Ensure the catalog row exists before referencing it (FK).
            res_ach = await db.execute(select(Achievement).where(Achievement.id == spec["id"]))
            ach = res_ach.scalars().first()
            if not ach:
                ach = Achievement(
                    id=spec["id"],
                    title=spec["title"],
                    description=spec["description"],
                    icon_name=spec["icon_name"],
                    category=spec["category"],
                    xp_reward=spec["xp_reward"],
                    coin_reward=spec["coin_reward"],
                )
                db.add(ach)
                await db.flush()

            db.add(UserAchievement(user_id=user_id, achievement_id=spec["id"]))

            profile.xp += ach.xp_reward
            profile.coins = (profile.coins or 0) + ach.coin_reward
            level_info = GameService.calculate_level_and_xp(profile, 0)
            profile.level = level_info["level"]
            profile.next_level_xp = level_info["next_level_xp"]

            unlocked.append(spec["id"])

        if unlocked:
            await db.flush()

        return unlocked

    @staticmethod
    async def get_achievement_status(db: AsyncSession, user_id, profile: UserProfile) -> list[dict]:
        """
        The full catalog, each entry annotated with this user's actual
        progress/unlocked state — computed from the same data and the same
        thresholds evaluate_achievements() unlocks against, so this can never
        drift from what the server actually grants (unlike the old
        client-computed achievement list, which had no backend record at all).
        """
        res = await db.execute(
            select(UserAchievement.achievement_id).where(UserAchievement.user_id == user_id)
        )
        unlocked_ids = set(res.scalars().all())

        status = []
        for spec in ACHIEVEMENT_CATALOG:
            progress = spec["progress"](profile)
            target = spec["target"]
            status.append({
                "id": spec["id"],
                "title": spec["title"],
                "description": spec["description"],
                "icon_name": spec["icon_name"],
                "category": spec["category"],
                "xp_reward": spec["xp_reward"],
                "coin_reward": spec["coin_reward"],
                "unlocked": spec["id"] in unlocked_ids,
                "progress": min(progress, target),
                "target": target,
            })
        return status


def _completed_count(profile: UserProfile) -> int:
    return len(profile.completed_node_ids or [])


# Server-authoritative achievement catalog.
#
# Previously the backend had exactly one achievement ("first_blood") while the
# frontend computed a separate, richer list client-side that had no server
# record. This is the single source of truth both should read from.
#
# `predicate` receives the profile *after* the triggering event has been applied.
def _has_defeated_boss(p: UserProfile) -> bool:
    # Same convention the (now-removed) client-only achievement check used:
    # boss node ids contain "boss" (see BossFight.tsx / api/v1/user.py, which
    # both derive the completed node id from the boss encounter's own id).
    return any("boss" in nid.lower() for nid in (p.completed_node_ids or []))


# Each entry carries both a boolean `predicate` (used by evaluate_achievements
# to decide what to unlock) and a `progress`/`target` pair (used by
# get_achievement_status to render a progress bar) — the two must agree, i.e.
# predicate(p) is true exactly when progress(p) >= target.
ACHIEVEMENT_CATALOG: list[dict] = [
    {
        "id": "first_blood",
        "title": "First Blood",
        "description": "Complete your first challenge.",
        "icon_name": "Sword",
        "category": "combat",
        "xp_reward": 200,
        "coin_reward": 50,
        "events": {"first_challenge_completed"},
        "predicate": lambda p: _completed_count(p) >= 1,
        "progress": _completed_count,
        "target": 1,
    },
    {
        "id": "apprentice",
        "title": "Apprentice",
        "description": "Complete 10 challenges.",
        "icon_name": "BookOpen",
        "category": "learning",
        "xp_reward": 300,
        "coin_reward": 100,
        "events": {"first_challenge_completed"},
        "predicate": lambda p: _completed_count(p) >= 10,
        "progress": _completed_count,
        "target": 10,
    },
    {
        "id": "journeyman",
        "title": "Journeyman",
        "description": "Complete 50 challenges.",
        "icon_name": "Compass",
        "category": "learning",
        "xp_reward": 750,
        "coin_reward": 250,
        "events": {"first_challenge_completed"},
        "predicate": lambda p: _completed_count(p) >= 50,
        "progress": _completed_count,
        "target": 50,
    },
    {
        "id": "centurion",
        "title": "Centurion",
        "description": "Complete 100 challenges.",
        "icon_name": "Shield",
        "category": "learning",
        "xp_reward": 1500,
        "coin_reward": 500,
        "events": {"first_challenge_completed"},
        "predicate": lambda p: _completed_count(p) >= 100,
        "progress": _completed_count,
        "target": 100,
    },
    {
        "id": "streak_3",
        "title": "Warming Up",
        "description": "Maintain a 3-day coding streak.",
        "icon_name": "Flame",
        "category": "consistency",
        "xp_reward": 150,
        "coin_reward": 75,
        "events": {"first_challenge_completed", "streak_updated"},
        "predicate": lambda p: (p.streak or 0) >= 3,
        "progress": lambda p: p.streak or 0,
        "target": 3,
    },
    {
        "id": "streak_7",
        "title": "Week Warrior",
        "description": "Maintain a 7-day coding streak.",
        "icon_name": "Flame",
        "category": "consistency",
        "xp_reward": 400,
        "coin_reward": 200,
        "events": {"first_challenge_completed", "streak_updated"},
        "predicate": lambda p: (p.streak or 0) >= 7,
        "progress": lambda p: p.streak or 0,
        "target": 7,
    },
    {
        "id": "streak_30",
        "title": "Unbroken",
        "description": "Maintain a 30-day coding streak.",
        "icon_name": "Flame",
        "category": "consistency",
        "xp_reward": 2000,
        "coin_reward": 1000,
        "events": {"first_challenge_completed", "streak_updated"},
        "predicate": lambda p: (p.streak or 0) >= 30,
        "progress": lambda p: p.streak or 0,
        "target": 30,
    },
    {
        "id": "rising_star",
        "title": "Rising Star",
        "description": "Reach a skill rating of 1200.",
        "icon_name": "Star",
        "category": "mastery",
        "xp_reward": 500,
        "coin_reward": 200,
        "events": {"first_challenge_completed"},
        "predicate": lambda p: (p.rank_rating or 0) >= 1200,
        "progress": lambda p: p.rank_rating or 0,
        "target": 1200,
    },
    {
        "id": "elite_coder",
        "title": "Elite Coder",
        "description": "Reach a skill rating of 1600.",
        "icon_name": "Trophy",
        "category": "mastery",
        "xp_reward": 1200,
        "coin_reward": 500,
        "events": {"first_challenge_completed"},
        "predicate": lambda p: (p.rank_rating or 0) >= 1600,
        "progress": lambda p: p.rank_rating or 0,
        "target": 1600,
    },
    {
        "id": "boss_slayer",
        "title": "Boss Slayer",
        "description": "Defeat your first boss.",
        "icon_name": "Crown",
        "category": "combat",
        "xp_reward": 800,
        "coin_reward": 400,
        # Triggered from both /execute/submit and /user/progress, whichever
        # records the boss encounter's completed node id first — see
        # _has_defeated_boss for the (pre-existing) node-id convention this
        # relies on.
        "events": {"first_challenge_completed"},
        "predicate": lambda p: _has_defeated_boss(p),
        "progress": lambda p: 1 if _has_defeated_boss(p) else 0,
        "target": 1,
    },
]


game_service = GameService()
