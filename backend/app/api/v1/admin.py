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

@router.get("/users")
async def list_admin_users(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, le=100),
    current_admin: User = Depends(require_permission("users:view")),
    db: AsyncSession = Depends(get_db)
):
    skip_val = skip.default if hasattr(skip, 'default') else skip
    limit_val = limit.default if hasattr(limit, 'default') else limit
    stmt = select(User).order_by(User.created_at.desc()).offset(int(skip_val)).limit(int(limit_val))
    res = await db.execute(stmt)
    users = res.scalars().all()
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
                "created_at": u.created_at.isoformat()
            } for u in users
        ]
    }

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

    return {
        "status": "SUCCESS",
        "usage": {
            "total_calls": total_calls or 0,
            "total_tokens": total_tokens or 0,
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
