from fastapi import APIRouter, Depends, status, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
import random
import string

from app.core.database import get_db
from app.core.redis import redis_manager
from app.core.email import send_otp_email
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.models.user import User, UserProfile, SkillRating
from app.schemas.auth import UserCreate, UserLogin, Token, UserResponse, OTPVerifyRequest, OTPResendRequest, RefreshTokenRequest
from app.core.exceptions import AuthenticationError, ValidationError
from app.api.deps import get_current_user, RateLimiter

router = APIRouter()

async def _generate_and_send_otp(email: str, background_tasks: BackgroundTasks):
    """Generates a 6-digit OTP, stores it in Redis for 5 minutes, and sends the email in the background."""
    if not redis_manager.redis_client:
        # Fallback for dev environments without Redis
        otp = "123456"
    else:
        otp = "".join(random.choices(string.digits, k=6))
        await redis_manager.redis_client.setex(f"otp:{email}", 300, otp)
    
    background_tasks.add_task(send_otp_email, email, otp)
    return otp

@router.post("/register", response_model=dict, status_code=201, dependencies=[Depends(RateLimiter(5, 3600))])
async def register_user(user_in: UserCreate, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    """Registers a new user (inactive until OTP verification)."""
    res = await db.execute(select(User).where(User.email == user_in.email))
    if res.scalars().first():
        raise ValidationError("Email is already registered.")

    res_user = await db.execute(select(User).where(User.username == user_in.username))
    if res_user.scalars().first():
        raise ValidationError("Username is already taken.")

    hashed_pwd = hash_password(user_in.password)
    new_user = User(
        email=user_in.email,
        username=user_in.username,
        hashed_password=hashed_pwd,
        role="user",
        is_active=False  # Requires OTP Verification
    )
    db.add(new_user)
    await db.flush()

    profile = UserProfile(user_id=new_user.id)
    skills = SkillRating(user_id=new_user.id)
    db.add(profile)
    db.add(skills)
    await db.commit()
    
    await _generate_and_send_otp(user_in.email, background_tasks)
    
    return {"message": "User registered. OTP sent to email.", "email": user_in.email}

@router.post("/login", response_model=Token, dependencies=[Depends(RateLimiter(5, 60))])
async def login(credentials: UserLogin, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    """Authenticates credentials against Argon2id hash. Rejects if not verified."""
    res = await db.execute(select(User).where(User.username == credentials.username))
    user = res.scalars().first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise AuthenticationError("Invalid username or password.")
        
    if not user.is_active:
        # Generate new OTP automatically when they try to log in unverified
        await _generate_and_send_otp(user.email, background_tasks)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail={"message": "Account not verified", "email": user.email}
        )

    access_token = create_access_token(subject=str(user.id))
    refresh_token = create_refresh_token(subject=str(user.id))
    
    return Token(access_token=access_token, refresh_token=refresh_token)

@router.post("/verify-otp", response_model=Token, dependencies=[Depends(RateLimiter(10, 60))])
async def verify_otp(request: OTPVerifyRequest, db: AsyncSession = Depends(get_db)):
    """Verifies OTP and activates user, returning auth tokens."""
    if redis_manager.redis_client:
        stored_otp = await redis_manager.redis_client.get(f"otp:{request.email}")
        if not stored_otp or stored_otp != request.otp:
            raise AuthenticationError("Invalid or expired OTP.")
        await redis_manager.redis_client.delete(f"otp:{request.email}")
    else:
        # Dev fallback
        if request.otp != "123456":
            raise AuthenticationError("Invalid OTP.")

    res = await db.execute(select(User).where(User.email == request.email))
    user = res.scalars().first()
    if not user:
        raise AuthenticationError("User not found.")
        
    user.is_active = True
    await db.commit()
    
    access_token = create_access_token(subject=str(user.id))
    refresh_token = create_refresh_token(subject=str(user.id))
    
    return Token(access_token=access_token, refresh_token=refresh_token)

@router.post("/resend-otp", response_model=dict, dependencies=[Depends(RateLimiter(3, 3600))])
async def resend_otp(request: OTPResendRequest, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.email == request.email))
    user = res.scalars().first()
    if not user:
        # Don't reveal user existence
        return {"message": "If the email is registered, an OTP was sent."}
        
    if user.is_active:
        raise ValidationError("Account is already verified.")
        
    await _generate_and_send_otp(request.email, background_tasks)
    return {"message": "If the email is registered, an OTP was sent."}

@router.post("/refresh", response_model=Token)
async def refresh_token(request: RefreshTokenRequest):
    """Exchanges a valid refresh token for a new access token."""
    try:
        payload = decode_token(request.refresh_token)
        if payload.get("type") != "refresh":
            raise AuthenticationError("Invalid token type.")
        user_id = payload.get("sub")
        if not user_id:
            raise AuthenticationError("Invalid token payload.")
            
        access_token = create_access_token(subject=user_id)
        # We can issue a new refresh token or keep the old one. We'll just return the same one for simplicity
        return Token(access_token=access_token, refresh_token=request.refresh_token)
    except Exception:
        raise AuthenticationError("Invalid or expired refresh token.")

@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    """Returns currently authenticated user profile and skill details."""
    return current_user
