"""
Refresh token tracking, rotation, and reuse detection.

Previously, create_refresh_token() minted a JWT and nothing ever recorded,
rotated, or revoked it — a stolen refresh token stayed valid until its natural
7-day expiry no matter what the user did in /auth/sessions. The RefreshToken
table existed in the schema for exactly this but nothing wrote to it.

Backward-compatible by design: a refresh token issued before this feature
existed has no matching row, and check_and_rotate() treats "no row" as
"allowed" rather than rejecting it — so nothing that currently works can
start failing. Only newly-issued (tracked) tokens gain real rotation and
reuse-after-revocation detection.
"""
import hashlib
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.core.logging import logger
from app.models.admin import RefreshToken


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def record(
    db: AsyncSession,
    user_id,
    token: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> None:
    """
    Persist a newly-issued refresh token. Purely additive — never raises, so
    a failure here (e.g. a hash collision from a retried request) can never
    break login/registration/OAuth, which all call this as a side effect of
    the real work they're doing.
    """
    try:
        db.add(
            RefreshToken(
                user_id=user_id,
                token_hash=_hash(token),
                expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
                ip_address=ip_address,
                user_agent=user_agent,
            )
        )
        await db.flush()
    except Exception:
        logger.warning("Failed to record refresh token for user_id=%s", user_id)


async def check_and_rotate(db: AsyncSession, old_token: str, new_token: str, user_id) -> bool:
    """
    Returns True if the refresh is allowed. On success, marks `old_token`
    revoked and records `new_token` as its replacement (rotation) — reusing
    `old_token` again after this point is now a detectable theft signal.

    Returns False (and revokes every tracked token for this user, as a
    precaution) if `old_token` was already marked revoked — i.e. someone is
    replaying a refresh token that was already rotated away, exactly the
    signal a stolen-and-reused refresh token would produce.
    """
    res = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == _hash(old_token)))
    row = res.scalars().first()

    if not row:
        # Untracked (pre-existing) token — allow, but start tracking its
        # successor so the *next* refresh benefits from real rotation.
        await record(db, user_id, new_token)
        return True

    if row.is_revoked:
        logger.warning(
            "Refresh token reuse detected for user_id=%s — revoking all tracked tokens.",
            user_id,
        )
        await db.execute(
            RefreshToken.__table__.update()
            .where(RefreshToken.user_id == user_id, RefreshToken.is_revoked.is_(False))
            .values(is_revoked=True)
        )
        await db.flush()
        return False

    row.is_revoked = True
    new_row = RefreshToken(
        user_id=user_id,
        token_hash=_hash(new_token),
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(new_row)
    await db.flush()
    row.replaced_by_id = new_row.id
    return True
