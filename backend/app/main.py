# Code Realm FastAPI Application - Local Dev Safe
import sys


import signal
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import app.models
from app.core.config import settings
from app.core.logging import logger
from app.core.redis import redis_manager
from app.core.exceptions import global_exception_handler, CodeRealmException
from app.api.v1.health import router as health_router
from app.api.v1.auth import router as auth_router
from app.api.v1.execution import router as execution_router
from app.api.v1.ai import router as ai_router
from app.api.v1.challenges import router as challenges_router
from app.api.v1.leaderboards import router as leaderboards_router
from app.api.v1.career import router as career_router
from app.api.v1.memory import router as memory_router
from app.api.v1.practice import router as practice_router
from app.api.v1.contests import router as contests_router

from app.core.database import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for startup and graceful SIGTERM shutdown."""
    logger.info("Initializing CODE REALM FastAPI Backend Application...")
    await redis_manager.connect()
    try:
        await init_db()
        logger.info("PostgreSQL database tables verified & synchronized.")
    except Exception as e:
        logger.warn(f"Database initialization warning: {e}")
    yield
    logger.info("Performing graceful shutdown sequence (SIGTERM)...")
    await redis_manager.close()
    logger.info("Shutdown sequence complete.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS Middleware Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handler Registration
app.add_exception_handler(CodeRealmException, global_exception_handler)
app.add_exception_handler(Exception, global_exception_handler)

from app.api.v1.nodes import router as nodes_router
from app.api.v1.admin import router as admin_router
from app.api.v1.user import router as user_router

# Include Routers
app.include_router(health_router, tags=["Health"])
app.include_router(auth_router, prefix=f"{settings.API_V1_STR}/auth", tags=["Auth"])
app.include_router(auth_router, prefix="/api/auth", tags=["Google OAuth Root"])
app.include_router(user_router, prefix=f"{settings.API_V1_STR}/user", tags=["User Profile & HQ"])
app.include_router(nodes_router, prefix=f"{settings.API_V1_STR}/nodes", tags=["Nodes & Workstation"])
app.include_router(admin_router, prefix=f"{settings.API_V1_STR}/admin", tags=["Admin & Moderation Console"])
app.include_router(execution_router, prefix=f"{settings.API_V1_STR}/execute", tags=["Code Execution"])
app.include_router(ai_router, prefix=f"{settings.API_V1_STR}/ai/mentor", tags=["AI Mentor"])
app.include_router(challenges_router, prefix=f"{settings.API_V1_STR}/challenges", tags=["Challenges"])
app.include_router(leaderboards_router, prefix=f"{settings.API_V1_STR}/leaderboards", tags=["Leaderboards"])
app.include_router(career_router, prefix=f"{settings.API_V1_STR}/career", tags=["Career"])
app.include_router(memory_router, prefix=f"{settings.API_V1_STR}/memory", tags=["Project Memory Context RAG"])
app.include_router(practice_router, prefix=f"{settings.API_V1_STR}/practice", tags=["Learning & Practice"])
app.include_router(contests_router, prefix=f"{settings.API_V1_STR}/contests", tags=["Contests"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
