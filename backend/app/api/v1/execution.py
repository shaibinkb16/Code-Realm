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

    
    # 2. Map Challenge difficulty to an Elo rating
    challenge_rating = 1000
    if req.challenge_id:
        challenge = await db.get(Challenge, req.challenge_id)
        if challenge:
            if challenge.difficulty.lower() == "easy":
                challenge_rating = 800
            elif challenge.difficulty.lower() == "medium":
                challenge_rating = 1200
            elif challenge.difficulty.lower() == "hard":
                challenge_rating = 1600

    # 3. Gamification Logic
    if current_user.profile:
        game_service.update_streak(current_user.profile)
        old_rating = current_user.profile.rank_rating
        
        # Calculate new Elo based on result
        won = result.all_passed
        rating_change = game_service.calculate_elo_change(old_rating, challenge_rating, won)
        new_rating = old_rating + rating_change
        
        if won:
            # Add XP and Coins
            xp_reward = result.xp_earned
            coin_reward = result.coins_earned
            
            # Use game service to calculate level ups
            level_info = game_service.calculate_level_and_xp(current_user.profile, xp_reward)
            current_user.profile.level = level_info["level"]
            current_user.profile.xp = level_info["xp"]
            current_user.profile.next_level_xp = level_info["next_level_xp"]
            current_user.profile.coins += coin_reward
            current_user.profile.stars += result.stars_earned
            
            # Check for achievements
            await game_service.evaluate_achievements(db, current_user.id, current_user.profile, "first_challenge_completed")
        else:
            # Log Mistake
            if req.challenge_id:
                # Figure out error type
                error_type = result.status if result.status != "FAILED" else "LogicError"
                
                # Look for exception in output if it's a runtime error
                error_message = result.output
                if "SyntaxError" in result.output:
                    error_type = "SyntaxError"
                elif "IndexError" in result.output:
                    error_type = "IndexError"
                
                mistake = MistakeLog(
                    user_id=current_user.id,
                    challenge_id=req.challenge_id,
                    error_type=error_type,
                    error_message=error_message,
                    code_snapshot=req.code
                )
                db.add(mistake)
            
        # Save Code Submission to Database
        if req.challenge_id:
            from app.models.submission import CodeSubmission
            submission_record = CodeSubmission(
                user_id=current_user.id,
                challenge_id=req.challenge_id,
                submitted_code=req.code,
                language=req.language,
                status="passed" if won else (result.status.lower() if result.status else "failed"),
                execution_time_ms=int(result.execution_time_ms or 0),
                stars_earned=result.stars_earned if won else 0
            )
            db.add(submission_record)

        # Update Rating, League, and User Profile Stats
        if current_user.profile:
            current_user.profile.rank_rating = new_rating
            current_user.profile.rank = game_service.get_league_from_rating(new_rating)
            if won:
                xp_earned = getattr(result, 'xp_earned', 100) or 100
                coins_earned = getattr(result, 'coins_earned', 50) or 50
                stars_earned = getattr(result, 'stars_earned', 3) or 3

                current_user.profile.xp += xp_earned
                current_user.profile.coins += coins_earned
                current_user.profile.stars += stars_earned
                current_user.profile.level = (current_user.profile.xp // 1000) + 1
                current_user.profile.next_level_xp = current_user.profile.level * 1000
        
        # Save History
        history = RatingHistory(
            user_id=current_user.id,
            domain_type="global",
            old_rating=old_rating,
            new_rating=new_rating,
            change_reason="challenge_completed" if won else "challenge_failed",
            challenge_id=req.challenge_id
        )
        db.add(history)
        await db.commit()
    
    return result
