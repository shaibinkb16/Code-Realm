from app.core.redis import redis_manager
from app.core.logging import logger
from app.repositories.challenge_repository import ChallengeRepository
from app.services.ai_mentor_service import ai_mentor_service
from app.models.challenge import Challenge, QuestionSet, TestCase

class QuestionBankService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ChallengeRepository(db)

    async def get_or_create_question_set(
        self,
        node_id: str,
        node_title: str = "Unknown Node",
        realm_name: str = "Code Realm",
        node_type: str = "challenge",
        skill_rating: int = 905,
        target_language: str = "python"
    ) -> QuestionSet:
        target_lang = target_language.lower()
        difficulty = "Easy" if skill_rating < 600 else ("Medium" if skill_rating < 1200 else "Hard")
        if node_type.lower() == "boss":
            difficulty = "Boss"

        # 1. First DB Check (Fast path)
        qset = await self.repo.get_question_set(node_id=node_id, language_id=target_lang, difficulty=difficulty)
        if qset:
            return qset

        # 2. Acquire Redis Concurrency Lock (Key: question_generation_lock:{node_id}:{lang}:{difficulty})
        lock_key = f"question_generation_lock:{node_id}:{target_lang}:{difficulty}"
        lock_acquired = False
        try:
            if redis_manager.redis_client:
                lock_acquired = await redis_manager.redis_client.set(lock_key, "locked", nx=True, ex=15)
                if not lock_acquired:
                    logger.info(f"[Concurrency Lock] Waiting for question set generation lock on {lock_key}...")
                    import asyncio
                    for _ in range(20):
                        await asyncio.sleep(0.2)
                        qset = await self.repo.get_question_set(node_id=node_id, language_id=target_lang, difficulty=difficulty)
                        if qset:
                            return qset

            # 3. Double-Check DB inside lock (Essential pattern)
            qset = await self.repo.get_question_set(node_id=node_id, language_id=target_lang, difficulty=difficulty)
            if qset:
                return qset

            # 4. Generate batch via LLM & persist Primary + 2 Alternates
            batch_res = await ai_mentor_service.generate_challenge_batch(
                node_title=node_title,
                realm_name=realm_name,
                node_type=node_type,
                skill_rating=skill_rating,
                target_language=target_lang
            )
            challenges_data = batch_res.get("challenges", [])
            
            qset = await self.repo.create_question_set(
                realm_id=realm_name,
                node_id=node_id,
                language_id=target_lang,
                difficulty=difficulty,
                challenges_data=challenges_data
            )
            return qset
        finally:
            if lock_acquired and redis_manager.redis_client:
                try:
                    await redis_manager.redis_client.delete(lock_key)
                except Exception:
                    pass

    @staticmethod
    def format_challenge_public(c: Challenge) -> Dict[str, Any]:
        """
        DTO Boundary Protection:
        Returns ChallengePublic payload stripping canonical_solution,
        hidden test cases (is_hidden=True), and administrative fields.
        """
        visible_test_cases = [
            {
                "id": str(t.id),
                "input": t.input_data,
                "expectedOutput": t.expected_output,
                "description": t.description
            }
            for t in (c.test_cases or [])
            if not getattr(t, 'is_hidden', False) # Enforces hidden test case masking
        ]

        return {
            "id": c.id,
            "title": c.title,
            "type": c.type,
            "difficulty": c.difficulty,
            "description": c.description,
            "storyContext": c.story_context,
            "initialCode": c.initial_code,
            "language": c.language,
            "testCases": visible_test_cases,
            "hints": c.hints or [],
            "explanation": c.explanation or "",
            "xpReward": c.xp_reward,
            "coinReward": c.coin_reward
        }
