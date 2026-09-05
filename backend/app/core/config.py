import os
import secrets as _secrets
import logging
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field

logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    PROJECT_NAME: str = "CODE REALM API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = Field(default="development", env="ENVIRONMENT")

    # Security & Tokens
    # No default: must be supplied via env/.env. Validated in _validate_secrets()
    # below, which fails fast in production and generates an ephemeral key in dev.
    SECRET_KEY: str = Field(default="", env="SECRET_KEY")
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

    # Supabase & Database Credentials.
    # All blank by default — supply via .env (local) or platform env vars (deploy).
    # See .env.example for the full list.
    SUPABASE_URL: str = Field(default="", env="SUPABASE_URL")
    SUPABASE_KEY: str = Field(default="", env="SUPABASE_KEY")
    DATABASE_URL: str = Field(default="", env="DATABASE_URL")

    @property
    def IS_PRODUCTION(self) -> bool:
        return self.ENVIRONMENT.strip().lower() in ("production", "prod")

    @property
    def ASYNC_DATABASE_URI(self) -> str:
        url = self.DATABASE_URL
        if not url:
            # Development fallback so the app still boots without a configured
            # database. aiosqlite is already a declared dependency.
            return "sqlite+aiosqlite:///./coderealm_dev.db"
        return url.replace("postgres://", "postgresql+asyncpg://").replace("postgresql://", "postgresql+asyncpg://")


    # Redis Cache & Rate Limiting
    REDIS_URL: str | None = Field(default=None, env="REDIS_URL")
    REDIS_HOST: str = Field(default="localhost", env="REDIS_HOST")
    REDIS_PORT: int = Field(default=6379, env="REDIS_PORT")

    @property
    def REDIS_URI(self) -> str:
        if self.REDIS_URL:
            return self.REDIS_URL
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/0"

    # Execution sandbox. Off by default: enqueuing a job only helps if a
    # separate `arq app.core.worker.WorkerSettings` process is running and
    # consuming the same Redis queue. When it's off (or the worker isn't
    # running), execution transparently falls back to the local subprocess
    # path — see ExecutionService._execute_sandboxed.
    EXECUTION_USE_SANDBOX: bool = Field(default=False, env="EXECUTION_USE_SANDBOX")

    # AI Model Integrations & Fallbacks
    AI_API_KEY: str = Field(default="", env="AI_API_KEY")
    GROQ_API_KEY: str = Field(default="", env="GROQ_API_KEY")
    # NOTE: the previous default ("gemini-3.5-flash") is not a released Gemini
    # model id, so every request fell through to the Groq tier. Verify this
    # against Google's current model list for your API key before deploying.
    GEMINI_MODEL: str = Field(default="gemini-2.5-flash", env="GEMINI_MODEL")



    # SMTP / Email Configuration
    SMTP_HOST: str = Field(default="smtp.gmail.com", env="SMTP_HOST")
    SMTP_PORT: int = Field(default=587, env="SMTP_PORT")
    SMTP_USER: str = Field(default="", env="SMTP_USER")
    SMTP_PASS: str = Field(default="", env="SMTP_PASS")
    SMTP_FROM: str = Field(default="noreply@coderealm.dev", env="SMTP_FROM")

    # Google OAuth Configuration
    GOOGLE_CLIENT_ID: str = Field(default="", env="GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET: str = Field(default="", env="GOOGLE_CLIENT_SECRET")
    GOOGLE_REDIRECT_URI: str = Field(
        default="http://localhost:8000/api/auth/google/callback",
        env="GOOGLE_REDIRECT_URI"
    )

    # GitHub OAuth Configuration
    GITHUB_CLIENT_ID: str = Field(default="", env="GITHUB_CLIENT_ID")
    GITHUB_CLIENT_SECRET: str = Field(default="", env="GITHUB_CLIENT_SECRET")
    GITHUB_REDIRECT_URI: str = Field(
        default="http://localhost:8000/api/auth/github/callback",
        env="GITHUB_REDIRECT_URI"
    )

    FRONTEND_URL: str = Field(
        default="http://localhost:5173",
        env="FRONTEND_URL"
    )

    class Config:
        case_sensitive = True
        env_file = [".env", "backend/.env", "../.env"]

settings = Settings()


def _validate_secrets(s: Settings) -> None:
    """
    Enforce that required secrets come from the environment.

    Production: missing secrets are a hard failure — better to refuse to boot
    than to run on a predictable key that anyone reading the repo would know.
    Development: warn loudly and fall back to an ephemeral key so local work
    isn't blocked. An ephemeral key means JWTs don't survive a restart, which
    is the correct tradeoff for local development.
    """
    missing = [name for name in ("SECRET_KEY", "DATABASE_URL") if not getattr(s, name)]

    if s.IS_PRODUCTION:
        if missing:
            raise RuntimeError(
                "Missing required environment variables in production: "
                f"{', '.join(missing)}. Set them in your deployment environment "
                "(Render dashboard / platform secrets). See .env.example."
            )
        return

    if "SECRET_KEY" in missing:
        s.SECRET_KEY = _secrets.token_hex(32)
        logger.warning(
            "SECRET_KEY not set — generated an ephemeral development key. "
            "Sessions will not survive a restart. Set SECRET_KEY in .env to persist them."
        )
    if "DATABASE_URL" in missing:
        logger.warning(
            "DATABASE_URL not set — falling back to local SQLite (./coderealm_dev.db). "
            "Set DATABASE_URL in .env to use Postgres."
        )


_validate_secrets(settings)

# Allow overriding CORS origins via a comma-separated env var 'CORS_ORIGINS'.
# Useful for runtime environments (Render, Vercel) where setting list
# environment variables as JSON is inconvenient.
env_cors = os.getenv("CORS_ORIGINS")
if env_cors:
    # split on commas and strip whitespace
    settings.CORS_ORIGINS = [o.strip() for o in env_cors.split(",") if o.strip()]
