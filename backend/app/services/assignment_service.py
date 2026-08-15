import uuid
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.challenge import Challenge, UserNodeAssignment, UserNodeAssignmentHistory, QuestionSet
from app.repositories.challenge_repository import ChallengeRepository
from app.services.question_bank_service import QuestionBankService

class AssignmentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ChallengeRepository(db)

    async def get_or_assign_node_challenge(
        self,
        user_id: uuid.UUID,
        node_id: str,
        node_title: str = "Unknown Node",
        realm_name: str = "Code Realm",
        node_type: str = "challenge",
        skill_rating: int = 905,
        target_language: str = "python"
    ) -> Dict[str, Any]:
        target_lang = target_language.lower()

        # 1. Check existing assignment in DB
        assignment = await self.repo.get_user_assignment(user_id, node_id)
        if assignment and assignment.challenge and assignment.challenge.language == target_lang:
            c = assignment.challenge
            return {
                "status": "SUCCESS",
                "challenge": QuestionBankService.format_challenge_public(c),
                "savedCode": assignment.saved_code or c.initial_code,
                "isCompleted": assignment.is_completed,
                "swapCount": assignment.swap_count
            }

        # 2. Get or create QuestionSet (via Redis Concurrency Lock)
        qset = await QuestionBankService(self.db).get_or_create_question_set(
            node_id=node_id,
            node_title=node_title,
            realm_name=realm_name,
            node_type=node_type,
            skill_rating=skill_rating,
            target_language=target_lang
        )

        # Pick Primary challenge (alternate_index == 0)
        primary_challenge = qset.challenges[0] if qset.challenges else None
        if not primary_challenge:
            raise ValueError(f"QuestionSet {qset.id} contains no challenges.")

        # Assign user to Primary challenge
        assignment = await self.repo.assign_user_to_challenge(
            user_id=user_id,
            node_id=node_id,
            question_set=qset,
            challenge=primary_challenge
        )

        return {
            "status": "SUCCESS",
            "challenge": QuestionBankService.format_challenge_public(primary_challenge),
            "savedCode": assignment.saved_code or primary_challenge.initial_code,
            "isCompleted": assignment.is_completed,
            "swapCount": assignment.swap_count
        }

    async def swap_assignment(
        self,
        user_id: uuid.UUID,
        node_id: str,
        target_language: str = "python"
    ) -> Dict[str, Any]:
        target_lang = target_language.lower()

        assignment = await self.repo.get_user_assignment(user_id, node_id)
        if not assignment or not assignment.question_set_id:
            # First assign via get_or_assign
            res = await self.get_or_assign_node_challenge(user_id, node_id, target_language=target_lang)
            assignment = await self.repo.get_user_assignment(user_id, node_id)

        # Query all challenges in QuestionSet
        stmt = (
            select(Challenge)
            .options(selectinload(Challenge.test_cases))
            .where(
                (Challenge.node_id == node_id) &
                (Challenge.language == target_lang)
            )
            .order_by(Challenge.alternate_index)
        )
        res_chals = await self.db.execute(stmt)
        all_chals = res_chals.scalars().all()

        if not all_chals:
            raise ValueError("No challenges available in Question Bank for swapping.")

        current_idx = 0
        for idx, c in enumerate(all_chals):
            if c.id == assignment.challenge_id:
                current_idx = idx
                break

        next_idx = (current_idx + 1) % len(all_chals)
        next_challenge = all_chals[next_idx]

        # Log assignment history before update
        history = UserNodeAssignmentHistory(
            id=uuid.uuid4(),
            assignment_id=assignment.id,
            user_id=user_id,
            node_id=node_id,
            event_type="SWAPPED",
            challenge_id=next_challenge.id,
            saved_code_snapshot=assignment.saved_code
        )
        self.db.add(history)

        assignment.challenge_id = next_challenge.id
        assignment.saved_code = next_challenge.initial_code
        assignment.swap_count += 1
        await self.db.commit()

        return {
            "status": "SUCCESS",
            "message": f"Swapped to alternate challenge {next_challenge.alternate_index + 1}",
            "challenge": QuestionBankService.format_challenge_public(next_challenge),
            "savedCode": next_challenge.initial_code,
            "swapCount": assignment.swap_count
        }

    async def save_code_draft(self, user_id: uuid.UUID, node_id: str, code: str) -> bool:
        assignment = await self.repo.get_user_assignment(user_id, node_id)
        if assignment:
            assignment.saved_code = code
            await self.db.commit()
            return True
        return False
