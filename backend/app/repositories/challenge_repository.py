import uuid
import hashlib
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.challenge import MapNode, Realm, QuestionSet, Challenge, TestCase, UserNodeAssignment, UserNodeAssignmentHistory, UserNodeProgress

class ChallengeRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_node_by_id(self, node_id: str) -> Optional[MapNode]:
        return await self.db.get(MapNode, node_id)

    async def get_question_set(self, node_id: str, language_id: str = "python", difficulty: str = "Medium") -> Optional[QuestionSet]:
        stmt = (
            select(QuestionSet)
            .options(selectinload(QuestionSet.challenges).selectinload(Challenge.test_cases))
            .where(
                (QuestionSet.node_id == node_id) &
                (QuestionSet.language_id == language_id) &
                (QuestionSet.difficulty == difficulty) &
                (QuestionSet.status == "ACTIVE")
            )
            .order_by(QuestionSet.generation_version.desc())
        )
        res = await self.db.execute(stmt)
        return res.scalars().first()

    async def create_question_set(
        self,
        realm_id: str,
        node_id: str,
        language_id: str,
        difficulty: str,
        challenges_data: list,
        generation_model: str = "gemini-3.6-flash",
        prompt_version: str = "question-generator-v4"
    ) -> QuestionSet:
        # Ensure Realm exists in realms table
        realm_obj = await self.db.get(Realm, realm_id)
        if not realm_obj:
            realm_obj = Realm(
                id=realm_id,
                name=realm_id,
                tagline="Realm of Code Realm",
                description="RPG Realm",
                order_num=1,
                is_unlocked=True,
                is_active=True,
                theme_color="purple",
                icon="shield"
            )
            self.db.add(realm_obj)
            await self.db.flush()

        # Ensure MapNode exists in map_nodes table
        node_obj = await self.db.get(MapNode, node_id)
        if not node_obj:
            node_obj = MapNode(
                id=node_id,
                realm_id=realm_id,
                title=node_id,
                type="challenge",
                x_coord=100,
                y_coord=100,
                difficulty=difficulty,
                min_skill_rating=300,
                max_skill_rating=2500,
                order_num=1,
                prerequisites=[],
                icon_name="code",
                is_active=True
            )
            self.db.add(node_obj)
            await self.db.flush()

        raw_hash_content = f"{node_id}:{language_id}:{difficulty}:{challenges_data[0].get('title', '')}"
        content_hash = hashlib.sha256(raw_hash_content.encode()).hexdigest()

        qset = QuestionSet(
            id=uuid.uuid4(),
            realm_id=realm_id,
            node_id=node_id,
            language_id=language_id,
            difficulty=difficulty,
            min_skill_rating=300,
            max_skill_rating=2500,
            generation_model=generation_model,
            prompt_version=prompt_version,
            status="ACTIVE",
            content_hash=content_hash
        )
        self.db.add(qset)
        await self.db.flush()

        for idx, gen_c in enumerate(challenges_data):
            c_id = f"{node_id}-{language_id}-alt{idx}" if idx > 0 else f"{node_id}-{language_id}"
            existing = await self.db.get(Challenge, c_id)
            if existing:
                c_id = f"{c_id}-{str(uuid.uuid4())[:8]}"

            c_hash = hashlib.sha256(f"{c_id}:{gen_c.get('title', '')}".encode()).hexdigest()
            db_challenge = Challenge(
                id=c_id,
                question_set_id=qset.id,
                node_id=node_id,
                realm_id=realm_id,
                alternate_index=idx,
                min_skill_rating=300,
                max_skill_rating=2500,
                title=gen_c.get("title", f"Challenge {idx+1}"),
                type=gen_c.get("type", "puzzle"),
                difficulty=difficulty,
                description=gen_c.get("description", ""),
                story_context=gen_c.get("storyContext", ""),
                initial_code=gen_c.get("initialCode", ""),
                language=language_id,
                canonical_solution=gen_c.get("canonicalSolution", None),
                xp_reward=gen_c.get("xpReward", 100 + (idx * 20)),
                coin_reward=gen_c.get("coinReward", 50 + (idx * 10)),
                explanation=gen_c.get("explanation", ""),
                tags=[node_id, realm_id],
                hints=gen_c.get("hints", []),
                generated_by="ai",
                generation_model=generation_model,
                prompt_version=prompt_version,
                validation_status="approved",
                status="ACTIVE",
                review_status="approved",
                content_hash=c_hash
            )
            self.db.add(db_challenge)
            await self.db.flush()

            for order_idx, tc in enumerate(gen_c.get("testCases", [])):
                db_tc = TestCase(
                    id=uuid.uuid4(),
                    challenge_id=c_id,
                    input_data=str(tc.get("input", "")),
                    expected_output=str(tc.get("expectedOutput", "")),
                    description=tc.get("description", f"Test Case {order_idx+1}"),
                    is_hidden=tc.get("is_hidden", False),
                    order_num=order_idx,
                    timeout_ms=5000
                )
                self.db.add(db_tc)

        await self.db.commit()
        
        # Reload with relationships
        stmt_reload = (
            select(QuestionSet)
            .options(selectinload(QuestionSet.challenges).selectinload(Challenge.test_cases))
            .where(QuestionSet.id == qset.id)
        )
        res = await self.db.execute(stmt_reload)
        return res.scalars().first()

    async def get_user_assignment(self, user_id: uuid.UUID, node_id: str) -> Optional[UserNodeAssignment]:
        stmt = (
            select(UserNodeAssignment)
            .options(selectinload(UserNodeAssignment.challenge).selectinload(Challenge.test_cases))
            .where(
                (UserNodeAssignment.user_id == user_id) &
                (UserNodeAssignment.node_id == node_id)
            )
        )
        res = await self.db.execute(stmt)
        return res.scalars().first()

    async def assign_user_to_challenge(self, user_id: uuid.UUID, node_id: str, question_set: QuestionSet, challenge: Challenge) -> UserNodeAssignment:
        assignment = await self.get_user_assignment(user_id, node_id)
        if not assignment:
            assignment = UserNodeAssignment(
                id=uuid.uuid4(),
                user_id=user_id,
                node_id=node_id,
                question_set_id=question_set.id,
                challenge_id=challenge.id,
                saved_code=challenge.initial_code,
                swap_count=0,
                is_completed=False
            )
            self.db.add(assignment)
            await self.db.flush()

            history = UserNodeAssignmentHistory(
                id=uuid.uuid4(),
                assignment_id=assignment.id,
                user_id=user_id,
                node_id=node_id,
                event_type="ASSIGNED",
                challenge_id=challenge.id,
                saved_code_snapshot=challenge.initial_code
            )
            self.db.add(history)
            await self.db.commit()
        return assignment
