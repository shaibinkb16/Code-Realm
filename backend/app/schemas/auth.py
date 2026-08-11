from pydantic import BaseModel, EmailStr, Field
from uuid import UUID
from typing import Optional

class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=30)
    password: str = Field(..., min_length=8)

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)

class OTPResendRequest(BaseModel):
    email: EmailStr

class UserProfileResponse(BaseModel):
    title: str
    avatar: str
    level: int
    xp: int
    next_level_xp: int
    coins: int
    stars: int
    streak: int
    rank: str
    rank_rating: int
    pet_stage: str
    pet_level: int
    hq_level: str

    class Config:
        from_attributes = True

from typing import List

class LanguageMasteryResponse(BaseModel):
    id: UUID
    language_id: UUID
    mastery_percentage: float
    skill_rating: int

    class Config:
        from_attributes = True

class TopicMasteryResponse(BaseModel):
    id: UUID
    topic_id: UUID
    mastery_percentage: float
    skill_rating: int

    class Config:
        from_attributes = True

class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    username: str
    role: str
    profile: Optional[UserProfileResponse] = None
    language_mastery: List[LanguageMasteryResponse] = Field(default_factory=list)
    topic_mastery: List[TopicMasteryResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True
