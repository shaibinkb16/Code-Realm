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

    @staticmethod
    def calculate_elo_change(player_rating: int, challenge_rating: int, won: bool, k_factor: int = 32) -> int:
        """
        Calculates the rating change using the Elo rating system.
        If won is True, positive-sum logic ensures they always gain at least 1 point.
        If won is False, we use a forgiving penalty (or 0 if positive-sum only).
        """
        # Calculate expected win probability
        expected_score = 1 / (1 + 10 ** ((challenge_rating - player_rating) / 400))
        actual_score = 1 if won else 0
        
        # Calculate raw change
        change = k_factor * (actual_score - expected_score)
        
        # Apply positive-sum adjustments
        if won:
            return max(1, int(change)) # Always gain at least 1 point for a win
        else:
            # Forgiving penalty: don't lose points, or lose very little
            return 0 # Currently 0 penalty as per user preference (positive-sum)

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
    async def evaluate_achievements(db: AsyncSession, user_id: str, profile: UserProfile, event: str):
        """
        Evaluates and unlocks achievements based on an event trigger.
        MVP: Hardcoded logic for first achievement unlock.
        """
        if event == "first_challenge_completed":
            # Check if they already have it
            res = await db.execute(
                select(UserAchievement).where(
                    UserAchievement.user_id == user_id, 
                    UserAchievement.achievement_id == "first_blood"
                )
            )
            existing = res.scalars().first()
            if not existing:
                # Make sure the achievement exists in DB
                res_ach = await db.execute(select(Achievement).where(Achievement.id == "first_blood"))
                ach = res_ach.scalars().first()
                if not ach:
                    ach = Achievement(
                        id="first_blood",
                        title="First Blood",
                        description="Complete your first challenge.",
                        icon_name="Sword",
                        category="combat",
                        xp_reward=200,
                        coin_reward=50
                    )
                    db.add(ach)
                    await db.commit()
                
                # Unlock it for user
                ua = UserAchievement(user_id=user_id, achievement_id="first_blood")
                db.add(ua)
                # Give rewards
                profile.xp += ach.xp_reward
                profile.coins += ach.coin_reward
                # Recalculate level if necessary
                level_info = GameService.calculate_level_and_xp(profile, 0) # Just forcing a check
                profile.level = level_info["level"]
                profile.next_level_xp = level_info["next_level_xp"]
                
                await db.commit()

game_service = GameService()
