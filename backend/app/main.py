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

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for startup and graceful SIGTERM shutdown."""
    logger.info("Initializing CODE REALM FastAPI Backend Application...")
    await redis_manager.connect()
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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handler Registration
app.add_exception_handler(CodeRealmException, global_exception_handler)
app.add_exception_handler(Exception, global_exception_handler)

# Include Routers
app.include_router(health_router, tags=["Health"])
app.include_router(auth_router, prefix=f"{settings.API_V1_STR}/auth", tags=["Auth"])
app.include_router(execution_router, prefix=f"{settings.API_V1_STR}/execute", tags=["Code Execution"])
app.include_router(ai_router, prefix=f"{settings.API_V1_STR}/ai/mentor", tags=["AI Mentor"])
app.include_router(challenges_router, prefix=f"{settings.API_V1_STR}/challenges", tags=["Challenges"])
app.include_router(leaderboards_router, prefix=f"{settings.API_V1_STR}/leaderboards", tags=["Leaderboards"])
app.include_router(career_router, prefix=f"{settings.API_V1_STR}/career", tags=["Career"])
app.include_router(memory_router, prefix=f"{settings.API_V1_STR}/memory", tags=["Project Memory Context RAG"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
