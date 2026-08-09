from datetime import datetime, timedelta
from typing import Any, Union
from passlib.context import CryptContext
import jwt
from app.core.config import settings
from app.core.logging import logger

pwd_context = CryptContext(
    schemes=["argon2", "bcrypt"],
    deprecated="auto"
)

def hash_password(password: str) -> str:
    """Hash password using Argon2id algorithm."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against stored hash."""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "iat": datetime.utcnow(),
        "type": "access"
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> dict:
    try:
        decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return decoded
    except jwt.ExpiredSignatureError:
        logger.warning("JWT Token has expired")
        raise
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid JWT Token: {str(e)}")
        raise
