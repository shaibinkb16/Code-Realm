"""
Daily & Weekly Missions — real, server-computed "what to do" checklists.

Deliberately have no dedicated table: every task is computed from data that
already exists (code_submissions, the reward_grants ledger added for
RewardService, and the user's profile), so there's no new schema, no sync
bugs between "mission state" and "actual progress", and claiming a bonus
uses the same idempotency ledger as every other reward in the app.
"""
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Literal

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select

from app.models.submission import CodeSubmission
from app.models.gamification import RewardGrant
from app.models.user import UserProfile
from app.services.reward_service import reward_service

Period = Literal["daily", "weekly"]

# Per-period configuration. Weekly targets are roughly a week's worth of
# daily targets, not a flat 7x multiple — completing every daily mission
# already covers the week, so the weekly bonus rewards showing up across
# several days rather than cramming everything into one sitting.
PERIOD_CONFIG: dict[Period, dict] = {
    "daily": {
        "challenges_target": 2,
        "xp_target": 150,
        "streak_target": 1,  # "was active today"
        "streak_label": "Keep your streak alive today",
        "bonus_xp": 120,
        "bonus_coins": 60,
    },
    "weekly": {
        "challenges_target": 10,
        "xp_target": 800,
        "streak_target": 5,  # "active at least 5 of the last 7 days"
        "streak_label": "Maintain a 5-day streak this week",
        "bonus_xp": 600,
        "bonus_coins": 300,
    },
}


def _period_bounds(period: Period) -> tuple[datetime, datetime]:
    """Returns (start, next_reset) for the period containing "now", both naive UTC."""
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)

    if period == "daily":
        return today_start, today_start + timedelta(days=1)

    # Weekly: Monday 00:00 UTC through the following Monday 00:00 UTC.
    week_start = today_start - timedelta(days=today_start.weekday())
    return week_start, week_start + timedelta(days=7)


def _mission_key(user_id, period: Period, start: datetime) -> str:
    return f"{period}_mission:{user_id}:{start.date().isoformat()}"


@dataclass
class MissionTask:
    id: str
    label: str
    progress: int
    target: int
    completed: bool = field(init=False)

    def __post_init__(self):
        self.completed = self.progress >= self.target


class MissionService:
    @staticmethod
    async def _compute_tasks(
        db: AsyncSession, user_id, profile: UserProfile, period: Period, start: datetime
    ) -> list[MissionTask]:
        cfg = PERIOD_CONFIG[period]

        solved_res = await db.execute(
            select(func.count(CodeSubmission.id)).where(
                CodeSubmission.user_id == user_id,
                CodeSubmission.status == "passed",
                CodeSubmission.created_at >= start,
            )
        )
        solved_count = solved_res.scalar() or 0

        xp_res = await db.execute(
            select(func.coalesce(func.sum(RewardGrant.xp_granted), 0)).where(
                RewardGrant.user_id == user_id,
                RewardGrant.created_at >= start,
                RewardGrant.reason.notin_(["daily_mission", "weekly_mission"]),  # bonuses don't count toward earning themselves
            )
        )
        xp_earned = int(xp_res.scalar() or 0)

        # Both periods use the live streak counter as their consistency
        # signal — "daily" just asks whether it's still active today,
        # "weekly" asks for a materially longer current streak.
        streak_progress = min(profile.streak or 0, cfg["streak_target"]) if (
            period == "weekly" or (profile.last_activity_date and profile.last_activity_date >= start)
        ) else 0

        return [
            MissionTask(
                id="solve",
                label=f"Solve {cfg['challenges_target']} challenges",
                progress=min(solved_count, cfg["challenges_target"]),
                target=cfg["challenges_target"],
            ),
            MissionTask(
                id="streak",
                label=cfg["streak_label"],
                progress=streak_progress,
                target=cfg["streak_target"],
            ),
            MissionTask(
                id="xp",
                label=f"Earn {cfg['xp_target']} XP",
                progress=min(xp_earned, cfg["xp_target"]),
                target=cfg["xp_target"],
            ),
        ]

    @staticmethod
    async def get_status(db: AsyncSession, user_id, profile: UserProfile, period: Period = "daily") -> dict:
        start, resets_at = _period_bounds(period)
        cfg = PERIOD_CONFIG[period]
        tasks = await MissionService._compute_tasks(db, user_id, profile, period, start)
        all_completed = all(t.completed for t in tasks)

        existing = await reward_service.already_granted(db, _mission_key(user_id, period, start))

        return {
            "period": period,
            "tasks": [t.__dict__ for t in tasks],
            "all_completed": all_completed,
            "claimed": existing is not None,
            "bonus_xp": cfg["bonus_xp"],
            "bonus_coins": cfg["bonus_coins"],
            "resets_at": resets_at.isoformat() + "Z",
        }

    @staticmethod
    async def claim(db: AsyncSession, user_id, profile: UserProfile, period: Period = "daily"):
        """
        Re-verifies completion server-side (never trusts that the client's
        earlier GET reflected current state) before granting the bonus via the
        same idempotency ledger every other reward uses — a retried claim
        just returns the original grant, never a second one.
        """
        start, _ = _period_bounds(period)
        cfg = PERIOD_CONFIG[period]
        tasks = await MissionService._compute_tasks(db, user_id, profile, period, start)
        if not all(t.completed for t in tasks):
            return {"status": "INCOMPLETE", "tasks": [t.__dict__ for t in tasks]}

        result = await reward_service.grant_fixed(
            db,
            user_id=user_id,
            profile=profile,
            reason=f"{period}_mission",
            reference_id=start.date().isoformat(),
            xp=cfg["bonus_xp"],
            coins=cfg["bonus_coins"],
            idempotency_key=_mission_key(user_id, period, start),
        )
        return {
            "status": "CLAIMED" if result.granted else "ALREADY_CLAIMED",
            "xp": result.xp,
            "coins": result.coins,
        }


mission_service = MissionService()
