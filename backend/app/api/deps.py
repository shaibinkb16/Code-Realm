from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import jwt
from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User
from app.core.exceptions import AuthenticationError

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

from sqlalchemy.orm import selectinload

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Dependency that extracts and verifies JWT bearer token to return authenticated User."""
    import uuid
    try:
        payload = decode_token(token)
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise AuthenticationError("Invalid authentication token payload.")
        user_id = uuid.UUID(user_id_str)
    except Exception:
        raise AuthenticationError("Could not validate credentials.")

    res = await db.execute(select(User).options(selectinload(User.profile), selectinload(User.language_mastery), selectinload(User.topic_mastery)).where(User.id == user_id))
    user = res.scalars().first()
    if not user:
        raise AuthenticationError("User not found.")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user.")
    
    return user

oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

async def get_optional_user(
    token: str | None = Depends(oauth2_scheme_optional),
    db: AsyncSession = Depends(get_db)
) -> User | None:
    """Dependency that extracts User if bearer token exists, otherwise returns None."""
    if not token:
        return None
    import uuid
    try:
        payload = decode_token(token)
        user_id_str: str = payload.get("sub")
        if not user_id_str:
            return None
        user_id = uuid.UUID(user_id_str)
        res = await db.execute(select(User).options(selectinload(User.profile)).where(User.id == user_id))
        return res.scalars().first()
    except Exception:
        return None

from app.core.redis import redis_manager

class RateLimiter:
    def __init__(self, requests: int, window_seconds: int):
        self.requests = requests
        self.window_seconds = window_seconds

    async def __call__(self, request: Request):
        client_ip = request.client.host if request.client else "unknown"
        path = request.url.path
        identifier = f"{path}:{client_ip}"
        
        allowed = await redis_manager.check_rate_limit(identifier, limit=self.requests, window_sec=self.window_seconds)
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later."
            )


