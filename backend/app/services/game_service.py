from app.models.user import UserProfile, SkillRating

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
    def update_skill_ratings(skills: SkillRating, domain: str, boost: int = 15):
        """Authoritative skill matrix updater."""
        if hasattr(skills, domain):
            current_val = getattr(skills, domain)
            setattr(skills, domain, min(999, current_val + boost))

game_service = GameService()
