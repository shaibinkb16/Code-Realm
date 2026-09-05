import logging

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.execution import CodeExecutionRequest, ExecutionResponse
from app.services.execution_service import execution_service
from app.api.deps import get_db, get_current_user, RateLimiter
from app.models.user import User
from app.models.challenge import Challenge
from app.models.gamification import RatingHistory
from app.models.intelligence import MistakeLog
from app.services.game_service import game_service
from app.services.reward_service import reward_service, rewards_for
from app.services.mastery_service import mastery_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/run",
    response_model=ExecutionResponse,
    dependencies=[Depends(RateLimiter(60, 60))],
)
async def run_code_sandbox(
    req: CodeExecutionRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Executes user code against the AI-generated test cases passed in the
    request body.

    Authentication is required: this endpoint runs arbitrary user code, so it
    is the highest-risk surface in the API and must never be anonymous. It is
    additionally rate limited (60/min per IP) to bound abuse from a single
    authenticated account.
    """
    test_cases = [
        {
            "id": tc.id,
            "description": tc.description,
            "input": tc.input or "",
            "expected_output": tc.expected_output,
        }
        for tc in req.test_cases
    ]
    return await execution_service.execute_code(req.code, req.language, test_cases)


@router.post("/submit", response_model=ExecutionResponse)
async def submit_code_solution(
    req: CodeExecutionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Submits the final solution. Evaluates test cases, updates Elo rating, XP, and Coins.
    """
    test_cases = [
        {
            "id": tc.id,
            "description": tc.description,
            "input": tc.input or "",
            "expected_output": tc.expected_output,
        }
        for tc in req.test_cases
    ]
    
    # 1. Run the code with target language
    result = await execution_service.execute_code(req.code, req.language, test_cases)

    
    # 2. Resolve the challenge entity. Its persisted difficulty is the only
    #    input to reward sizing — the client never supplies reward amounts.
    challenge = None
    valid_challenge_id = None
    if req.challenge_id:
        challenge = await db.get(Challenge, req.challenge_id)
        if not challenge:
            from sqlalchemy import select
            res = await db.execute(select(Challenge).where(Challenge.node_id == req.challenge_id).limit(1))
            challenge = res.scalar_one_or_none()
        
        if not challenge:
            # Placeholder row for challenges that only ever existed as
            # ephemeral AI-generated/request-body content and were never
            # persisted ahead of time — needed to satisfy the FK constraints
            # on CodeSubmission/RatingHistory below.
            #
            # This previously omitted several NOT NULL columns (initial_code,
            # xp_reward, coin_reward, explanation), so the insert always
            # failed; the bare `except: db.rollback()` swallowed that error but
            # also expired every other object already loaded on this session
            # (including current_user.profile), which then crashed on next
            # access. Filling in the required columns lets this succeed in the
            # normal case; begin_nested() (a SAVEPOINT) means that if it still
            # fails for some other reason, only this insert is undone —
            # the rest of the request's session stays intact.
            fallback_rewards = rewards_for("medium")
            try:
                async with db.begin_nested():
                    challenge = Challenge(
                        id=req.challenge_id,
                        node_id=req.challenge_id,
                        realm_id="Code Realm",
                        title=f"Challenge {req.challenge_id}",
                        type="puzzle",
                        difficulty="Medium",
                        description="Code Realm Challenge",
                        initial_code="",
                        explanation="",
                        xp_reward=fallback_rewards["xp"],
                        coin_reward=fallback_rewards["coins"],
                        language=req.language or "python",
                        generated_by="ai",
                        validation_status="approved",
                    )
                    db.add(challenge)
                    await db.flush()
            except Exception:
                logger.exception(
                    "Failed to create placeholder challenge for id=%s", req.challenge_id
                )
                challenge = None

        if challenge:
            valid_challenge_id = challenge.id

    # 3. Gamification Logic
    if current_user.profile:
        from sqlalchemy.orm.attributes import flag_modified
        profile = current_user.profile
        game_service.update_streak(profile)
        old_rating = profile.rank_rating
        won = result.all_passed

        # All XP/coin/star/rating amounts are derived server-side from the
        # challenge's persisted difficulty and granted exactly once per
        # (user, challenge) via the reward ledger — a replayed or double-clicked
        # submit returns the original amounts without paying out again.
        reward = await reward_service.grant(
            db,
            user_id=current_user.id,
            profile=profile,
            reason="challenge_completed" if won else "challenge_attempted",
            reference_id=req.challenge_id,
            difficulty=challenge.difficulty if challenge else None,
            won=won,
        )
        new_rating = profile.rank_rating

        # Per-language / per-challenge-type mastery tracking. Independent of
        # the global Elo above — this is what a skill-breakdown UI reads from.
        challenge_rating = rewards_for(challenge.difficulty if challenge else None)["rating"]
        await mastery_service.record_submission(
            db,
            user_id=current_user.id,
            language=challenge.language if challenge else req.language,
            challenge_type=challenge.type if challenge else None,
            challenge_rating=challenge_rating,
            won=won,
        )

        if won:
            if req.challenge_id:
                c_ids = list(profile.completed_node_ids or [])
                if req.challenge_id not in c_ids:
                    c_ids.append(req.challenge_id)
                    profile.completed_node_ids = c_ids

                n_stars = dict(profile.node_stars or {})
                existing_s = n_stars.get(req.challenge_id, 0)
                n_stars[req.challenge_id] = max(existing_s, reward.stars or existing_s)
                profile.node_stars = n_stars

                flag_modified(profile, "completed_node_ids")
                flag_modified(profile, "node_stars")

            # Evaluate the full achievement catalog against post-reward state.
            unlocked = await game_service.evaluate_achievements(
                db, current_user.id, profile, "first_challenge_completed"
            )
            reward.unlocked_achievements = unlocked

            # Reflect the authoritative amounts back to the client so the UI
            # shows what was actually granted rather than what it guessed.
            result.xp_earned = reward.xp
            result.coins_earned = reward.coins
            result.stars_earned = reward.stars
        else:
            # Log Mistake
            if valid_challenge_id:
                error_type = result.status if result.status != "FAILED" else "LogicError"
                error_message = result.output
                if "SyntaxError" in result.output:
                    error_type = "SyntaxError"
                elif "IndexError" in result.output:
                    error_type = "IndexError"
                
                mistake = MistakeLog(
                    user_id=current_user.id,
                    challenge_id=valid_challenge_id,
                    error_type=error_type,
                    error_message=error_message,
                    code_snapshot=req.code
                )
                db.add(mistake)
            
        # Save Code Submission to Database
        if valid_challenge_id:
            from app.models.submission import CodeSubmission
            submission_record = CodeSubmission(
                user_id=current_user.id,
                challenge_id=valid_challenge_id,
                submitted_code=req.code,
                language=req.language,
                status="passed" if won else (result.status.lower() if result.status else "failed"),
                execution_time_ms=int(result.execution_time_ms or 0),
                stars_earned=result.stars_earned if won else 0,
                solve_time_seconds=req.solve_time_seconds,
            )
            db.add(submission_record)

        # Save History
        history = RatingHistory(
            user_id=current_user.id,
            domain_type="global",
            old_rating=old_rating,
            new_rating=new_rating,
            change_reason="challenge_completed" if won else "challenge_failed",
            challenge_id=valid_challenge_id
        )
        db.add(history)
        await db.commit()
    
    return result
