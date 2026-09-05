"""
Multi-dimensional skill mastery tracking.

The `user_language_mastery` / `user_topic_mastery` tables have existed in the
schema since the original learning-models migration, but nothing ever wrote
to them — they were only ever read (for leaderboard filtering), so every
row was permanently absent and any "per-skill breakdown" UI built on top of
them would have rendered empty. This service is what actually populates them,
using two dimensions already present on every graded submission and needing
no new schema:

  - language:      Challenge.language (a plain string, e.g. "python")
  - challenge type: Challenge.type (puzzle/battle/bughunt/detective/mystery/
                     speedrun/build/boss/explain) — used as the "topic" axis,
                     since challenges don't carry a finer-grained topic tag.

Does not commit — callers own the transaction, same convention as
RewardService and GameService.
"""
import logging
import uuid
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.learning import Language, Topic, UserLanguageMastery, UserTopicMastery

logger = logging.getLogger(__name__)

# How quickly mastery_percentage moves toward 100 (win) or decays toward its
# floor (loss). Small steps so mastery reflects a track record, not one run.
MASTERY_STEP = 6.0
MASTERY_FLOOR = 5.0
MASTERY_CEILING = 99.0

# Same damped-Elo shape as GameService.calculate_elo_change, applied per-skill
# instead of to the single global rating.
K_FACTOR = 24
LOSS_PENALTY_FACTOR = 0.5
RATING_FLOOR = 100


def _elo_delta(current: int, opponent: int, won: bool) -> int:
    expected = 1 / (1 + 10 ** ((opponent - current) / 400))
    change = K_FACTOR * ((1 if won else 0) - expected)
    if won:
        return max(1, int(change))
    penalty = int(change * LOSS_PENALTY_FACTOR)
    max_drop = max(0, current - RATING_FLOOR)
    return -min(abs(penalty), max_drop)


async def _get_or_create_language(db: AsyncSession, name: str) -> Language:
    key = (name or "python").strip().lower()
    res = await db.execute(select(Language).where(Language.name == key))
    lang = res.scalars().first()
    if lang:
        return lang
    lang = Language(name=key, display_name=key.capitalize(), version="latest")
    db.add(lang)
    await db.flush()
    return lang


async def _get_or_create_topic(db: AsyncSession, name: str) -> Topic:
    key = (name or "puzzle").strip().lower()
    res = await db.execute(select(Topic).where(Topic.name == key))
    topic = res.scalars().first()
    if topic:
        return topic
    topic = Topic(name=key, category="challenge_type")
    db.add(topic)
    await db.flush()
    return topic


async def _get_or_create_language_mastery(
    db: AsyncSession, user_id, language: Language
) -> UserLanguageMastery:
    res = await db.execute(
        select(UserLanguageMastery).where(
            UserLanguageMastery.user_id == user_id,
            UserLanguageMastery.language_id == language.id,
        )
    )
    row = res.scalars().first()
    if row:
        return row
    row = UserLanguageMastery(user_id=user_id, language_id=language.id)
    db.add(row)
    await db.flush()
    return row


async def _get_or_create_topic_mastery(
    db: AsyncSession, user_id, topic: Topic
) -> UserTopicMastery:
    res = await db.execute(
        select(UserTopicMastery).where(
            UserTopicMastery.user_id == user_id,
            UserTopicMastery.topic_id == topic.id,
        )
    )
    row = res.scalars().first()
    if row:
        return row
    row = UserTopicMastery(user_id=user_id, topic_id=topic.id)
    db.add(row)
    await db.flush()
    return row


class MasteryService:
    @staticmethod
    async def record_submission(
        db: AsyncSession,
        user_id,
        language: Optional[str],
        challenge_type: Optional[str],
        challenge_rating: int,
        won: bool,
    ) -> None:
        """
        Update the (user, language) and (user, challenge-type) mastery rows
        for one graded submission.

        Wrapped in a SAVEPOINT (begin_nested), not a bare try/except: if any
        flush here fails (e.g. a concurrent request racing to create the same
        Language/Topic row), only this nested transaction rolls back. A bare
        except with no rollback would leave the outer session in Postgres's
        "current transaction aborted" state (or SQLAlchemy's equivalent
        pending-rollback state), silently breaking every subsequent write in
        the same request — the mistake log, the CodeSubmission row, and the
        final commit in api/v1/execution.py — for a failure that has nothing
        to do with any of them. This is the same class of bug fixed in
        execution.py's placeholder-Challenge creation.
        """
        try:
            async with db.begin_nested():
                lang_row = await _get_or_create_language(db, language)
                mastery = await _get_or_create_language_mastery(db, user_id, lang_row)
                mastery.skill_rating = max(
                    RATING_FLOOR, mastery.skill_rating + _elo_delta(mastery.skill_rating, challenge_rating, won)
                )
                if won:
                    mastery.mastery_percentage = min(
                        MASTERY_CEILING, mastery.mastery_percentage + MASTERY_STEP
                    )
                else:
                    mastery.mastery_percentage = max(
                        MASTERY_FLOOR, mastery.mastery_percentage - MASTERY_STEP / 2
                    )

                topic_row = await _get_or_create_topic(db, challenge_type)
                topic_mastery = await _get_or_create_topic_mastery(db, user_id, topic_row)
                topic_mastery.skill_rating = max(
                    RATING_FLOOR,
                    topic_mastery.skill_rating + _elo_delta(topic_mastery.skill_rating, challenge_rating, won),
                )
                if won:
                    topic_mastery.mastery_percentage = min(
                        MASTERY_CEILING, topic_mastery.mastery_percentage + MASTERY_STEP
                    )
                else:
                    topic_mastery.mastery_percentage = max(
                        MASTERY_FLOOR, topic_mastery.mastery_percentage - MASTERY_STEP / 2
                    )
        except Exception:
            # Mastery tracking must never break the submission flow it's
            # attached to — log and continue rather than raise. Safe now: the
            # SAVEPOINT above means the outer session is untouched.
            logger.exception("Failed to record mastery for user_id=%s", user_id)

    @staticmethod
    async def get_skill_breakdown(db: AsyncSession, user_id) -> dict:
        lang_res = await db.execute(
            select(UserLanguageMastery, Language)
            .join(Language, UserLanguageMastery.language_id == Language.id)
            .where(UserLanguageMastery.user_id == user_id)
        )
        languages = [
            {
                "name": lang.display_name,
                "mastery_percentage": round(m.mastery_percentage, 1),
                "skill_rating": m.skill_rating,
            }
            for m, lang in lang_res.all()
        ]

        topic_res = await db.execute(
            select(UserTopicMastery, Topic)
            .join(Topic, UserTopicMastery.topic_id == Topic.id)
            .where(UserTopicMastery.user_id == user_id)
        )
        topics = [
            {
                "name": topic.name.replace("_", " ").title(),
                "category": topic.category,
                "mastery_percentage": round(m.mastery_percentage, 1),
                "skill_rating": m.skill_rating,
            }
            for m, topic in topic_res.all()
        ]

        languages.sort(key=lambda x: -x["mastery_percentage"])
        topics.sort(key=lambda x: -x["mastery_percentage"])

        weakest_topic = min(topics, key=lambda x: x["mastery_percentage"]) if topics else None

        return {
            "languages": languages,
            "topics": topics,
            "weakest_topic": weakest_topic["name"] if weakest_topic else None,
        }


mastery_service = MasteryService()
