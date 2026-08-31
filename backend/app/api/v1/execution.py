from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.execution import CodeExecutionRequest, ExecutionResponse
from app.services.execution_service import execution_service
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.challenge import Challenge
from app.models.gamification import RatingHistory
from app.models.intelligence import MistakeLog
from app.services.game_service import game_service

router = APIRouter()


@router.post("/run", response_model=ExecutionResponse)
async def run_code_sandbox(req: CodeExecutionRequest):
    """
    Executes user code in the backend Python sandbox against the
    AI-generated test cases that are passed directly in the request body.
    No hardcoded data_loader — test cases come from the AI.
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

    
    # 2. Map Challenge difficulty to an Elo rating and ensure challenge entity exists
    challenge_rating = 1000
    valid_challenge_id = None
    if req.challenge_id:
        challenge = await db.get(Challenge, req.challenge_id)
        if not challenge:
            from sqlalchemy import select
            res = await db.execute(select(Challenge).where(Challenge.node_id == req.challenge_id).limit(1))
            challenge = res.scalar_one_or_none()
        
        if not challenge:
            # Create challenge entry dynamically so foreign key constraints are satisfied
            try:
                challenge = Challenge(
                    id=req.challenge_id,
                    node_id=req.challenge_id,
                    realm_id="Code Realm",
                    title=f"Challenge {req.challenge_id}",
                    type="puzzle",
                    difficulty="Medium",
                    description="Code Realm Challenge",
                    language=req.language or "python",
                    generated_by="ai",
                    validation_status="approved"
                )
                db.add(challenge)
                await db.flush()
            except Exception:
                await db.rollback()
                challenge = None

        if challenge:
            valid_challenge_id = challenge.id
            if challenge.difficulty.lower() == "easy":
                challenge_rating = 800
            elif challenge.difficulty.lower() == "medium":
                challenge_rating = 1200
            elif challenge.difficulty.lower() == "hard":
                challenge_rating = 1600

    # 3. Gamification Logic
    if current_user.profile:
        from sqlalchemy.orm.attributes import flag_modified
        game_service.update_streak(current_user.profile)
        old_rating = current_user.profile.rank_rating
        
        # Calculate new Elo based on result
        won = result.all_passed
        rating_change = game_service.calculate_elo_change(old_rating, challenge_rating, won)
        new_rating = old_rating + rating_change
        current_user.profile.rank_rating = new_rating
        current_user.profile.rank = game_service.get_league_from_rating(new_rating)
        
        if won:
            xp_reward = result.xp_earned or 100
            coin_reward = result.coins_earned or 50
            stars_reward = result.stars_earned or 3
            
            # Level and XP calculation
            level_info = game_service.calculate_level_and_xp(current_user.profile, xp_reward)
            current_user.profile.level = level_info["level"]
            current_user.profile.xp = level_info["xp"]
            current_user.profile.next_level_xp = level_info["next_level_xp"]
            current_user.profile.coins += coin_reward
            current_user.profile.stars += stars_reward
            
            if req.challenge_id:
                c_ids = list(current_user.profile.completed_node_ids or [])
                if req.challenge_id not in c_ids:
                    c_ids.append(req.challenge_id)
                    current_user.profile.completed_node_ids = c_ids
                
                n_stars = dict(current_user.profile.node_stars or {})
                existing_s = n_stars.get(req.challenge_id, 0)
                n_stars[req.challenge_id] = max(existing_s, stars_reward)
                current_user.profile.node_stars = n_stars

                flag_modified(current_user.profile, "completed_node_ids")
                flag_modified(current_user.profile, "node_stars")

            # Check for achievements
            await game_service.evaluate_achievements(db, current_user.id, current_user.profile, "first_challenge_completed")
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
                stars_earned=result.stars_earned if won else 0
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
