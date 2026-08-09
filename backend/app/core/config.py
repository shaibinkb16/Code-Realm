import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    PROJECT_NAME: str = "CODE REALM API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = Field(default="development", env="ENVIRONMENT")

    # Security & Tokens
    SECRET_KEY: str = Field(
        default="09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7",
        env="SECRET_KEY"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15  # 15 minutes
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000"
    ]

    # Add your deployed frontend origin(s) here so browsers can call the API.
    # For example, the Vercel production alias used by the frontend:
    # https://code-realm-frontend.vercel.app
    CORS_ORIGINS: List[str] = CORS_ORIGINS + [
        "https://code-realm-frontend.vercel.app",
    ]

    # Relational Database (PostgreSQL)
    DATABASE_URL: str | None = Field(default=None, env="DATABASE_URL")
    POSTGRES_USER: str = Field(default="coderealm", env="POSTGRES_USER")
    POSTGRES_PASSWORD: str = Field(default="coderealm_secret_pwd", env="POSTGRES_PASSWORD")
    POSTGRES_SERVER: str = Field(default="localhost", env="POSTGRES_SERVER")
    POSTGRES_PORT: str = Field(default="5432", env="POSTGRES_PORT")
    POSTGRES_DB: str = Field(default="coderealm_db", env="POSTGRES_DB")

    @property
    def ASYNC_DATABASE_URI(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL.replace("postgres://", "postgresql+asyncpg://").replace("postgresql://", "postgresql+asyncpg://")
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    # Redis Cache & Rate Limiting
    REDIS_URL: str | None = Field(default=None, env="REDIS_URL")
    REDIS_HOST: str = Field(default="localhost", env="REDIS_HOST")
    REDIS_PORT: int = Field(default=6379, env="REDIS_PORT")

    @property
    def REDIS_URI(self) -> str:
        if self.REDIS_URL:
            return self.REDIS_URL
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/0"

    # AI Model Integration
    AI_API_KEY: str = Field(default="", env="AI_API_KEY")

    # SMTP / Email Configuration
    SMTP_HOST: str = Field(default="smtp.gmail.com", env="SMTP_HOST")
    SMTP_PORT: int = Field(default=587, env="SMTP_PORT")
    SMTP_USER: str = Field(default="", env="SMTP_USER")
    SMTP_PASS: str = Field(default="", env="SMTP_PASS")
    SMTP_FROM: str = Field(default="noreply@coderealm.dev", env="SMTP_FROM")

    class Config:
        case_sensitive = True
        env_file = "../.env"

settings = Settings()

# Allow overriding CORS origins via a comma-separated env var 'CORS_ORIGINS'.
# Useful for runtime environments (Render, Vercel) where setting list
# environment variables as JSON is inconvenient.
env_cors = os.getenv("CORS_ORIGINS")
if env_cors:
    # split on commas and strip whitespace
    settings.CORS_ORIGINS = [o.strip() for o in env_cors.split(",") if o.strip()]
