from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import User, UserProfile, SkillRating
from app.schemas.auth import UserCreate, UserLogin, Token, UserResponse
from app.core.exceptions import AuthenticationError, ValidationError

router = APIRouter()

from sqlalchemy.orm import selectinload

@router.post("/register", response_model=UserResponse, status_code=201)
async def register_user(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    """Registers a new user with Argon2id password hashing and initial profile/skills."""
    # Check existing email
    res = await db.execute(select(User).where(User.email == user_in.email))
    if res.scalars().first():
        raise ValidationError("Email is already registered.")

    # Check existing username
    res_user = await db.execute(select(User).where(User.username == user_in.username))
    if res_user.scalars().first():
        raise ValidationError("Username is already taken.")

    # Create User with Argon2id hashed password
    hashed_pwd = hash_password(user_in.password)
    new_user = User(
        email=user_in.email,
        username=user_in.username,
        hashed_password=hashed_pwd,
        role="user"
    )
    db.add(new_user)
    await db.flush()

    # Create associated UserProfile and SkillRating
    profile = UserProfile(user_id=new_user.id)
    skills = SkillRating(user_id=new_user.id)
    db.add(profile)
    db.add(skills)

    await db.commit()
    
    # Query user with profile eagerly loaded
    res_final = await db.execute(select(User).options(selectinload(User.profile)).where(User.id == new_user.id))
    return res_final.scalars().first()

@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    """Authenticates credentials against Argon2id hash and issues JWT bearer token."""
    res = await db.execute(select(User).where(User.username == credentials.username))
    user = res.scalars().first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise AuthenticationError("Invalid username or password.")

    token = create_access_token(subject=str(user.id))
    return Token(access_token=token)

from app.api.deps import get_current_user

@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    """Returns currently authenticated user profile and skill details."""
    return current_user
