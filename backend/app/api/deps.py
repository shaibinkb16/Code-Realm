from fastapi import Depends, HTTPException, status
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
    try:
        payload = decode_token(token)
        user_id: str = payload.get("sub")
        if user_id is None:
            raise AuthenticationError("Invalid authentication token payload.")
    except Exception:
        raise AuthenticationError("Could not validate credentials.")

    res = await db.execute(select(User).options(selectinload(User.profile)).where(User.id == user_id))
    user = res.scalars().first()
    if not user:
        raise AuthenticationError("User not found.")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user.")
    
    return user
