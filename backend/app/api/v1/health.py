from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db
from app.core.redis import redis_manager

router = APIRouter()

@router.get("/health", status_code=status.HTTP_200_OK)
async def liveness_health_check():
    """Liveness probe: verifies application process is running."""
    return {"status": "healthy", "service": "code-realm-api"}

@router.get("/ready", status_code=status.HTTP_200_OK)
async def readiness_health_check(db: AsyncSession = Depends(get_db)):
    """Readiness probe: verifies database and Redis dependency health."""
    db_healthy = False
    redis_healthy = False

    try:
        result = await db.execute(text("SELECT 1"))
        db_healthy = result.scalar() == 1
    except Exception:
        db_healthy = False

    if redis_manager.redis_client:
        try:
            redis_healthy = await redis_manager.redis_client.ping()
        except Exception:
            redis_healthy = False

    if db_healthy:
        return {
            "status": "ready",
            "dependencies": {
                "database": "connected" if db_healthy else "disconnected",
                "redis": "connected" if redis_healthy else "degraded"
            }
        }
    
    return {
        "status": "unhealthy",
        "dependencies": {
            "database": "disconnected",
            "redis": "connected" if redis_healthy else "disconnected"
        }
    }
