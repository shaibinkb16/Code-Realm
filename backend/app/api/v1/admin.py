import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.api.deps import get_db, get_current_user
from app.models.user import User, UserProfile
from app.models.challenge import Challenge, QuestionSet
from app.models.admin import AdminRole, UserAdminRole, UserSanction, AdminActionLog, LLMUsageLog, SystemSetting, ChallengeReport

router = APIRouter()

# ─────────────────────────────────────────────────────────
# PERMISSION DEPENDENCY INJECTION
# ─────────────────────────────────────────────────────────
def require_permission(required_permission: str):
    async def permission_checker(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
    ) -> User:
        if current_user.role == "admin" or current_user.role == "super_admin":
            return current_user

        stmt = (
            select(AdminRole.permissions)
            .join(UserAdminRole, UserAdminRole.role_id == AdminRole.id)
            .where(
                (UserAdminRole.user_id == current_user.id) &
                (UserAdminRole.revoked_at.is_(None))
            )
        )
        res = await db.execute(stmt)
        permissions_lists = res.scalars().all()
        user_permissions = {p for plist in permissions_lists for p in plist}

        if required_permission not in user_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required permission: '{required_permission}'"
            )
        return current_user

    return permission_checker


# ─────────────────────────────────────────────────────────
# USER MANAGEMENT & SANCTIONS
# ─────────────────────────────────────────────────────────
class SanctionRequest(BaseModel):
    type: str # warn, mute, suspend, ban
    reason: str
    expires_at_days: Optional[int] = None

@router.get("/analytics")
async def get_admin_analytics(
    current_admin: User = Depends(require_permission("users:view")),
    db: AsyncSession = Depends(get_db)
):
    """Calculates live platform user activity analytics, submissions, and pending bug count."""
    from datetime import datetime, timedelta
    from app.models.submission import CodeSubmission
    from app.models.feedback import UserFeedback
    from app.models.user import UserProfile

    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    fifteen_min_ago = now - timedelta(minutes=15)

    res_total_users = await db.execute(select(func.count(User.id)))
    total_users = res_total_users.scalar() or 0

    res_active_today = await db.execute(
        select(func.count(UserProfile.id)).where(UserProfile.last_activity_date >= today_start)
    )
    active_today_users = res_active_today.scalar() or 0

    res_online_now = await db.execute(
        select(func.count(UserProfile.id)).where(UserProfile.last_activity_date >= fifteen_min_ago)
    )
    online_now_users = res_online_now.scalar() or 0

    res_submissions = await db.execute(select(func.count(CodeSubmission.id)))
    total_submissions = res_submissions.scalar() or 0

    res_bugs = await db.execute(
        select(func.count(UserFeedback.id)).where(UserFeedback.status == "pending")
    )
    res_gen_today = await db.execute(
        select(func.count(Challenge.id)).where(Challenge.created_at >= today_start)
    )
    questions_generated_today = res_gen_today.scalar() or 0

    res_passed_today = await db.execute(
        select(func.count(CodeSubmission.id)).where(
            CodeSubmission.created_at >= today_start,
            CodeSubmission.status == "passed"
        )
    )
    submissions_passed_today = res_passed_today.scalar() or 0

    res_ai_mentor = await db.execute(
        select(func.count(LLMUsageLog.id)).where(
            LLMUsageLog.created_at >= today_start,
            LLMUsageLog.feature == "mentor"
        )
    )
    ai_mentor_calls_today = res_ai_mentor.scalar() or 0

    return {
        "status": "SUCCESS",
        "analytics": {
            "total_users": total_users,
            "active_today_users": max(active_today_users, 1),
            "online_now_users": max(online_now_users, 1),
            "total_submissions": total_submissions,
            "pending_bugs": pending_bugs,
            "questions_generated_today": questions_generated_today,
            "submissions_passed_today": submissions_passed_today,
            "ai_mentor_calls_today": ai_mentor_calls_today
        }
    }

@router.get("/users")
async def list_admin_users(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, le=100),
    current_admin: User = Depends(require_permission("users:view")),
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy.orm import selectinload
    skip_val = skip.default if hasattr(skip, 'default') else skip
    limit_val = limit.default if hasattr(limit, 'default') else limit
    stmt = select(User).options(selectinload(User.profile)).order_by(User.created_at.desc()).offset(int(skip_val)).limit(int(limit_val))
    res = await db.execute(stmt)
    users = res.scalars().all()
    
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    fifteen_min_ago = now - timedelta(minutes=15)

    return {
        "status": "SUCCESS",
        "users": [
            {
                "id": str(u.id),
                "email": u.email,
                "username": u.username,
                "full_name": u.full_name,
                "role": u.role,
                "is_active": u.is_active,
                "last_activity_date": u.profile.last_activity_date.isoformat() if (u.profile and u.profile.last_activity_date) else None,
                "is_online": (u.profile and u.profile.last_activity_date and u.profile.last_activity_date >= fifteen_min_ago) or False,
                "created_at": u.created_at.isoformat()
            } for u in users
        ]
    }

@router.delete("/users/{user_id}")
async def delete_user_account(
    user_id: uuid.UUID,
    current_admin: User = Depends(require_permission("users:ban")),
    db: AsyncSession = Depends(get_db)
):
    """Permanently deletes a user account from PostgreSQL database."""
    target_user = await db.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    username = target_user.username
    await db.delete(target_user)

    log = AdminActionLog(
        id=uuid.uuid4(),
        admin_user_id=current_admin.id,
        action="user_deleted",
        target_type="user",
        target_id=str(user_id),
        before_state={"username": username, "email": target_user.email},
        after_state={"deleted": True}
    )
    db.add(log)
    await db.commit()

    return {"status": "SUCCESS", "message": f"User @{username} permanently deleted"}

@router.post("/users/{user_id}/sanction")
async def sanction_user(
    user_id: uuid.UUID,
    req: SanctionRequest,
    current_admin: User = Depends(require_permission("users:ban")),
    db: AsyncSession = Depends(get_db)
):
    target_user = await db.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    sanction = UserSanction(
        id=uuid.uuid4(),
        user_id=user_id,
        type=req.type,
        reason=req.reason,
        issued_by=current_admin.id,
        is_active=True
    )
    if req.type == "ban":
        target_user.is_active = False

    db.add(sanction)

    # Write Audit Log
    log = AdminActionLog(
        id=uuid.uuid4(),
        admin_user_id=current_admin.id,
        action=f"user_sanction_{req.type}",
        target_type="user",
        target_id=str(user_id),
        before_state={"is_active": True},
        after_state={"is_active": False, "reason": req.reason}
    )
    db.add(log)
    await db.commit()

    return {"status": "SUCCESS", "message": f"User {user_id} sanctioned with {req.type}"}


# ─────────────────────────────────────────────────────────
# CONTENT MODERATION QUEUE
# ─────────────────────────────────────────────────────────
class ReviewRequest(BaseModel):
    review_status: str # approved, flagged, retired
    comments: Optional[str] = None

@router.get("/challenges/pending")
async def list_pending_challenges(
    current_admin: User = Depends(require_permission("challenges:approve")),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Challenge)
        .where(Challenge.review_status == "unreviewed")
        .order_by(Challenge.created_at.desc())
        .limit(20)
    )
    res = await db.execute(stmt)
    challenges = res.scalars().all()
    return {
        "status": "SUCCESS",
        "pending": [
            {
                "id": c.id,
                "title": c.title,
                "difficulty": c.difficulty,
                "language": c.language,
                "node_id": c.node_id,
                "created_at": c.created_at.isoformat()
            } for c in challenges
        ]
    }

@router.post("/challenges/{challenge_id}/review")
async def review_challenge(
    challenge_id: str,
    req: ReviewRequest,
    current_admin: User = Depends(require_permission("challenges:approve")),
    db: AsyncSession = Depends(get_db)
):
    challenge = await db.get(Challenge, challenge_id)
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    old_status = challenge.review_status
    challenge.review_status = req.review_status
    if req.review_status == "retired":
        challenge.status = "RETIRED"
        challenge.is_deleted = True

    log = AdminActionLog(
        id=uuid.uuid4(),
        admin_user_id=current_admin.id,
        action="review_challenge",
        target_type="challenge",
        target_id=challenge_id,
        before_state={"review_status": old_status},
        after_state={"review_status": req.review_status, "comments": req.comments}
    )
    db.add(log)
    await db.commit()

    return {"status": "SUCCESS", "message": f"Challenge {challenge_id} updated to {req.review_status}"}


class BulkReviewRequest(BaseModel):
    challenge_ids: List[str]
    review_status: str  # approved, retired, flagged
    comments: Optional[str] = None


@router.post("/challenges/bulk-review")
async def bulk_review_challenges(
    req: BulkReviewRequest,
    current_admin: User = Depends(require_permission("challenges:approve")),
    db: AsyncSession = Depends(get_db)
):
    """Bulk approves or retires multiple AI-generated challenges in a single transaction."""
    if not req.challenge_ids:
        return {"status": "SUCCESS", "count": 0}

    stmt = select(Challenge).where(Challenge.id.in_(req.challenge_ids))
    res = await db.execute(stmt)
    challenges = res.scalars().all()

    for c in challenges:
        c.review_status = req.review_status
        if req.review_status == "retired":
            c.status = "RETIRED"
            c.is_deleted = True

    log = AdminActionLog(
        id=uuid.uuid4(),
        admin_user_id=current_admin.id,
        action=f"bulk_review_{req.review_status}",
        target_type="challenge_bulk",
        target_id=f"count_{len(challenges)}",
        before_state={"count": len(challenges)},
        after_state={"review_status": req.review_status}
    )
    db.add(log)
    await db.commit()

    return {"status": "SUCCESS", "message": f"{len(challenges)} challenges updated to {req.review_status}", "count": len(challenges)}


# ─────────────────────────────────────────────────────────
# LLM USAGE DASHBOARD & ACTION LOGS
# ─────────────────────────────────────────────────────────
@router.get("/llm/usage")
async def get_llm_usage(
    current_admin: User = Depends(require_permission("llm:view_usage")),
    db: AsyncSession = Depends(get_db)
):
    stmt_total = select(func.count(LLMUsageLog.id), func.sum(LLMUsageLog.total_tokens), func.avg(LLMUsageLog.latency_ms))
    res = await db.execute(stmt_total)
    total_calls, total_tokens, avg_latency = res.first()

    total_tokens_val = total_tokens or 0
    estimated_cost_usd = round(total_tokens_val * 0.00000015, 4)  # ~$0.15 per 1M tokens

    return {
        "status": "SUCCESS",
        "usage": {
            "total_calls": total_calls or 0,
            "total_tokens": total_tokens_val,
            "estimated_cost_usd": estimated_cost_usd,
            "avg_latency_ms": round(avg_latency or 0.0, 2)
        }
    }

@router.get("/logs/admin-actions")
async def get_admin_action_logs(
    current_admin: User = Depends(require_permission("logs:view_admin_actions")),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(AdminActionLog).order_by(AdminActionLog.created_at.desc()).limit(50)
    res = await db.execute(stmt)
    logs = res.scalars().all()
    return {
        "status": "SUCCESS",
        "action_logs": [
            {
                "id": str(l.id),
                "admin_user_id": str(l.admin_user_id) if l.admin_user_id else None,
                "action": l.action,
                "target_type": l.target_type,
                "target_id": l.target_id,
                "created_at": l.created_at.isoformat()
            } for l in logs
        ]
    }

class UpdateFeedbackStatusRequest(BaseModel):
    status: str  # pending, in_progress, resolved
    admin_notes: Optional[str] = None

@router.get("/feedback")
async def get_all_user_feedback(
    current_admin: User = Depends(require_permission("user:view_sanctions")),
    db: AsyncSession = Depends(get_db)
):
    from app.models.feedback import UserFeedback
    from sqlalchemy.orm import selectinload
    stmt = select(UserFeedback).options(selectinload(UserFeedback.user)).order_by(UserFeedback.created_at.desc()).limit(100)
    res = await db.execute(stmt)
    feedbacks = res.scalars().all()
    return {
        "status": "SUCCESS",
        "feedback": [
            {
                "id": str(f.id),
                "user_id": str(f.user_id),
                "username": f.user.username if f.user else "Unknown User",
                "email": f.user.email if f.user else "",
                "category": f.category,
                "rating": f.rating,
                "message": f.message,
                "status": f.status or "pending",
                "admin_notes": f.admin_notes,
                "resolved_at": f.resolved_at.isoformat() if f.resolved_at else None,
                "created_at": f.created_at.isoformat()
            } for f in feedbacks
        ]
    }

@router.patch("/feedback/{feedback_id}/status")
async def update_feedback_status(
    feedback_id: uuid.UUID,
    req: UpdateFeedbackStatusRequest,
    current_admin: User = Depends(require_permission("user:apply_sanctions")),
    db: AsyncSession = Depends(get_db)
):
    """Updates status and resolution note for user bug report / feedback."""
    from app.models.feedback import UserFeedback
    from datetime import datetime
    res = await db.execute(select(UserFeedback).where(UserFeedback.id == feedback_id))
    feedback = res.scalars().first()

    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback entry not found")

    feedback.status = req.status
    if req.admin_notes is not None:
        feedback.admin_notes = req.admin_notes.strip()
    if req.status == "resolved":
        feedback.resolved_at = datetime.utcnow()

    await db.commit()

    return {
        "status": "SUCCESS",
        "message": f"Feedback status updated to {req.status}",
        "feedback": {
            "id": str(feedback.id),
            "status": feedback.status,
            "admin_notes": feedback.admin_notes,
            "resolved_at": feedback.resolved_at.isoformat() if feedback.resolved_at else None
        }
    }
