from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db
from app.core.redis import redis_manager
from app.core.supabase import get_supabase_client

router = APIRouter()

@router.get("/health", status_code=status.HTTP_200_OK)
async def liveness_health_check():
    """Liveness probe: verifies application process is running."""
    return {"status": "healthy", "service": "code-realm-api"}

@router.get("/ready", status_code=status.HTTP_200_OK)
async def readiness_health_check(db: AsyncSession = Depends(get_db)):
    """
    Readiness probe: verifies database, Supabase, and Redis dependency health.

    Previously also pinged a MongoDB "fallback" connection, but no route or
    service anywhere in the backend ever read or wrote to it — it was
    connected and health-checked without ever being a real dependency.
    Removed rather than left as permanent dead weight; see git history if a
    real use for a secondary datastore comes up later.
    """
    db_healthy = False
    redis_healthy = False
    supabase_healthy = get_supabase_client() is not None

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
                "supabase_client": "connected" if supabase_healthy else "standby",
                "redis": "connected" if redis_healthy else "degraded"
            }
        }

    return {
        "status": "unhealthy",
        "dependencies": {
            "database": "disconnected",
            "supabase_client": "connected" if supabase_healthy else "standby",
            "redis": "connected" if redis_healthy else "disconnected"
        }
    }

