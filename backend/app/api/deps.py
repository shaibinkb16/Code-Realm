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

    res = await db.execute(select(User).options(selectinload(User.profile)).where(User.id == user_id))
    user = res.scalars().first()
    if not user:
        raise AuthenticationError("User not found.")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user.")
    
    return user

from app.core.redis import redis_manager

class RateLimiter:
    def __init__(self, requests: int, window_seconds: int):
        self.requests = requests
        self.window_seconds = window_seconds

    async def __call__(self, request: Request):
        if not redis_manager.redis_client:
            return  # Skip if Redis is not connected (e.g. during some tests)
            
        client_ip = request.client.host if request.client else "unknown"
        path = request.url.path
        key = f"rate_limit:{path}:{client_ip}"
        
        current = await redis_manager.redis_client.get(key)
        if current and int(current) >= self.requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later."
            )
            
        pipe = redis_manager.redis_client.pipeline()
        pipe.incr(key, 1)
        pipe.expire(key, self.window_seconds)
        await pipe.execute()
